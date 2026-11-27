"""Verify shared request limits across two real gateway processes."""
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import sys
import time

import httpx
import pytest
import redis


@pytest.fixture
def redis_endpoint(tmp_path):
    executable = os.getenv('NEWFIND_TEST_REDIS_SERVER') or shutil.which('redis-server')
    if not executable:
        pytest.skip('Redis executable is required for the replica test')
    with socket.socket() as port_socket:
        port_socket.bind(('127.0.0.1', 0))
        port = port_socket.getsockname()[1]
    server = subprocess.Popen([executable, '--bind', '127.0.0.1', '--port', str(port),
                               '--save', '', '--appendonly', 'no'], cwd=tmp_path)
    try:
        client = redis.Redis(host='127.0.0.1', port=port, socket_timeout=.3)
        for _ in range(100):
            try:
                if client.ping():
                    break
            except redis.RedisError:
                time.sleep(.05)
        else:
            pytest.fail('Isolated Redis did not start')
        yield f'redis://127.0.0.1:{port}/0'
    finally:
        server.terminate()
        server.wait(timeout=10)


def test_shared_rate_limit_survives_gateway_restart(redis_endpoint):
    root = Path(__file__).resolve().parents[2]
    env = dict(os.environ, PYTHONPATH=str(root), JWT_SECRET=secrets.token_hex(32),
               API_RATE_LIMIT='2/minute', NEWFIND_RATE_LIMIT_STORAGE_URI=redis_endpoint)
    env = {key: value for key, value in env.items() if key.lower() not in {"http_proxy", "https_proxy", "all_proxy"}}
    processes = []

    def start():
        with socket.socket() as port_socket:
            port_socket.bind(('127.0.0.1', 0))
            port = port_socket.getsockname()[1]
        process = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'main:app', '--host',
                                    '127.0.0.1', '--port', str(port)], cwd=root / 'backend/gateway', env=env)
        processes.append(process)
        url = f'http://127.0.0.1:{port}'
        for _ in range(100):
            if process.poll() is not None:
                pytest.fail("Gateway exited before readiness")
            try:
                if httpx.get(url, timeout=.3, trust_env=False).status_code == 200:
                    return process, url
            except httpx.HTTPError:
                time.sleep(.05)
        pytest.fail('Gateway did not start')

    try:
        first, first_url = start()
        _, second_url = start()
        with httpx.Client(trust_env=False) as http:
            path = '/isolated-rate-limit-test'
            assert http.get(first_url + path).status_code == 404
            assert http.get(second_url + path).status_code == 404
            assert http.get(second_url + path).status_code == 429
            first.terminate()
            first.wait(timeout=10)
            _, restarted_url = start()
            assert http.get(restarted_url + path).status_code == 429
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=10)
