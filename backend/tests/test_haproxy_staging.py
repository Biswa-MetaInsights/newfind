"""Exercise gateway and application-stack loss through HAProxy on loopback."""
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import sys
import threading
import time
from uuid import uuid4

import httpx
import psycopg2
from psycopg2 import sql
import pytest

from test_core_integration import core
from test_gateway_replicas import redis_endpoint

ROOT = Path(__file__).resolve().parents[2]


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


@pytest.fixture(scope='module')
def postgres_databases(tmp_path_factory):
    binaries = os.getenv('NEWFIND_TEST_POSTGRES_BIN')
    if not binaries:
        pytest.skip('Set NEWFIND_TEST_POSTGRES_BIN to a PostgreSQL binary directory')
    directory = tmp_path_factory.mktemp('newfind-postgres')
    data = directory / 'data'
    port = free_port()
    password = secrets.token_hex(32)
    password_file = directory / 'password'
    password_file.write_text(password + '\n')
    password_file.chmod(0o600)
    subprocess.run([str(Path(binaries) / 'initdb'), '-D', str(data), '-U', 'newfind',
                    '--auth=scram-sha-256', '--pwfile', str(password_file), '--no-locale', '-E', 'UTF8'],
                   check=True, capture_output=True, text=True, timeout=30)
    password_file.unlink()
    base = f'postgresql://newfind:{password}@127.0.0.1:{port}'
    log = directory / 'postgres.log'
    with log.open('w') as output:
        process = subprocess.Popen([str(Path(binaries) / 'postgres'), '-D', str(data), '-h', '127.0.0.1',
                                    '-p', str(port), '-k', ''], stdout=output, stderr=subprocess.STDOUT)
    try:
        for _ in range(100):
            if process.poll() is not None:
                pytest.fail(log.read_text())
            try:
                connection = psycopg2.connect(base + '/postgres', connect_timeout=1)
                break
            except psycopg2.OperationalError:
                time.sleep(.05)
        else:
            pytest.fail('PostgreSQL did not become ready')
        names = ['auth', 'user', 'event', 'ticketing']
        try:
            connection.autocommit = True
            with connection.cursor() as cursor:
                for name in names:
                    cursor.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(name)))
        finally:
            connection.close()
        yield {name: f'{base}/{name}' for name in names}
    finally:
        if process.poll() is None:
            process.terminate()
            process.wait(timeout=10)


@pytest.mark.parametrize('core', ['sqlite', 'postgres'], indirect=True)
def test_chat_and_booking_survive_gateway_loss(core, redis_endpoint, tmp_path, request):
    haproxy = os.getenv('NEWFIND_TEST_HAPROXY') or shutil.which('haproxy')
    if not haproxy:
        pytest.skip('HAProxy executable is required')
    core_api, restart_core = core
    env = dict(core_api.qa_gateway_env, NEWFIND_RATE_LIMIT_STORAGE_URI=redis_endpoint)
    stack_failover = request.node.callspec.params['core'] == 'postgres'
    processes = []

    def launch(args, cwd, process_env, label):
        log_path = tmp_path / f'{label}.log'
        with log_path.open('w') as log:
            process = subprocess.Popen(args, cwd=cwd, env=process_env, stdout=log, stderr=subprocess.STDOUT)
        processes.append(process)
        return process, log_path

    def await_ready(proc, log, port):
        for _ in range(100):
            if proc.poll() is not None:
                pytest.fail(log.read_text())
            try:
                if httpx.get(f'http://127.0.0.1:{port}/', timeout=.3, trust_env=False).status_code == 200:
                    return
            except httpx.HTTPError:
                pass
            time.sleep(.05)
        pytest.fail(f'{log.name} did not become ready')

    def application(port, label, folder, application_env):
        process, log = launch([sys.executable, '-m', 'uvicorn', 'main:app', '--host', '127.0.0.1',
                               '--port', str(port)], ROOT / folder, application_env, label)
        await_ready(process, log, port)
        return process

    def account(http, role):
        data = {'email': f'{role}-failover@example.org', 'password': secrets.token_urlsafe(20), 'full_name': role}
        assert http.post('/auth/register', json=data).status_code == 201
        login = http.post('/auth/login', json=data)
        assert login.status_code == 200
        headers = {'Authorization': 'Bearer ' + login.json()['access_token']}
        me = http.get('/auth/me', headers=headers)
        assert me.status_code == 200
        return me.json()['id'], headers

    port_a, port_b, proxy_port = [free_port() for _ in range(3)]
    cfg = tmp_path / 'haproxy.cfg'
    cfg.write_text(f'''defaults
    mode http
    timeout connect 1s
    timeout client 10s
    timeout server 10s
    retries 2
    retry-on conn-failure
    option redispatch 1
frontend newfind
    bind 127.0.0.1:{proxy_port}
    default_backend gateways
backend gateways
    balance roundrobin
    option httpchk GET /
    http-check expect status 200
    http-response set-header X-QA-Backend %[srv_name]
    server a 127.0.0.1:{port_a} check inter 250ms fall 2 rise 2
    server b 127.0.0.1:{port_b} check inter 250ms fall 2 rise 2
''')
    try:
        services = core_api.qa_database_urls
        replica_env = env
        if stack_failover:
            replica_ports = {name: free_port() for name in services}
            replica_urls = {env[f'{name.upper()}_SERVICE_URL']: f'http://127.0.0.1:{port}'
                            for name, port in replica_ports.items()}
            replica_env = {}
            for key, value in env.items():
                for original, replica in replica_urls.items():
                    if value == original or value.startswith(original + '/'):
                        value = replica + value[len(original):]
                        break
                replica_env[key] = value
            for name, database_url in services.items():
                application(replica_ports[name], f'{name}-b', f'backend/services/{name}',
                            dict(replica_env, DATABASE_URL=database_url))
        first = application(port_a, 'gateway-a', 'backend/gateway', env)
        application(port_b, 'gateway-b', 'backend/gateway', replica_env)
        proxy, log = launch([haproxy, '-db', '-f', str(cfg)], tmp_path, os.environ, 'haproxy')
        await_ready(proxy, log, proxy_port)
        with httpx.Client(base_url=f'http://127.0.0.1:{proxy_port}', trust_env=False, timeout=5,
                          limits=httpx.Limits(max_connections=32, max_keepalive_connections=32)) as http:
            organiser, owner = account(http, 'organiser')
            attendee, guest = account(http, 'attendee')
            profile = {'full_name': 'QA Organiser', 'company_name': 'Isolated QA', 'company_address': 'QA ONLY',
                       'company_email': 'qa@example.org', 'country': 'Belgium', 'registration_number': 'QA',
                       'bank_name': '', 'bank_account_number': ''}
            assert http.post(f'/user/{organiser}/organizer', headers=owner, json=profile).status_code == 201
            event_payload = {
                'organizer_id': organiser, 'title': 'Failover QA event', 'status': 'published', 'price': 0,
                'currency': 'EUR', 'capacity': 1, 'start_date': '2031-09-01T09:00:00Z',
                'end_date': '2031-09-01T11:00:00Z', 'timezone': 'UTC',
            }
            event = http.post('/event', headers=owner, json=event_payload)
            assert event.status_code == 201, event.text
            eid = event.json()['id']
            booking = {'event_id': eid, 'user_id': attendee, 'quantity': 1, 'request_id': str(uuid4())}
            if stack_failover:
                contender, contender_headers = account(http, 'second-attendee')
                second_booking = {**booking, 'user_id': contender, 'request_id': str(uuid4())}
                ready = threading.Barrier(2)

                def book_final_seat(headers, payload):
                    ready.wait(timeout=5)
                    return http.post('/ticket/book', headers=headers, json=payload)

                with ThreadPoolExecutor(max_workers=2) as pool:
                    first_attempt = pool.submit(book_final_seat, guest, booking)
                    second_attempt = pool.submit(book_final_seat, contender_headers, second_booking)
                    response = first_attempt.result()
                    competing_response = second_attempt.result()
                assert sorted([response.status_code, competing_response.status_code]) == [201, 409]
                if response.status_code == 409:
                    attendee, guest, booking, response = contender, contender_headers, second_booking, competing_response
            else:
                response = http.post('/ticket/book', headers=guest, json=booking)
            assert response.status_code == 201, response.text
            ticket = response.json()[0]['id']
            assert http.get(f'/ticket/qr/{ticket}', headers=guest).status_code == 200
            room = f'/event/{eid}/messages'
            message = {'content': 'Original participant message', 'request_id': str(uuid4())}
            original = http.post(room, headers=guest, json=message)
            assert original.status_code == 201
            endpoints = [('/event/search', {}), ('/event/rooms', guest), (room, owner), ('/auth/me', guest)]

            def burst(seconds, kill=False):
                start = time.monotonic()
                stop_at = start + 1.5
                settled_at = stop_at + 1
                barrier = threading.Barrier(16)

                def worker(index):
                    path, headers = endpoints[index % len(endpoints)]
                    records = []
                    barrier.wait(timeout=5)
                    while time.monotonic() < start + seconds:
                        began = time.monotonic()
                        try:
                            r = http.get(path, headers=headers)
                            code, backend = r.status_code, r.headers.get('x-qa-backend', 'none')
                        except httpx.RequestError:
                            code, backend = 0, 'none'
                        records.append((code, backend, round((time.monotonic() - began) * 1000, 1), began))
                        time.sleep(.06)
                    return records

                with ThreadPoolExecutor(max_workers=16) as pool:
                    tasks = [pool.submit(worker, index) for index in range(16)]
                    if kill:
                        time.sleep(max(0, stop_at - time.monotonic()))
                        first.kill()
                        if stack_failover:
                            core_api.qa_stop_services()
                        first.wait(timeout=5)
                    rows = [row for task in tasks for row in task.result()]
                codes = Counter(row[0] for row in rows)
                backends = Counter(row[1] for row in rows)
                latencies = sorted(row[2] for row in rows)
                p95 = latencies[int(.95 * (len(latencies) - 1))]
                settled = Counter((code, target) for code, target, _, began in rows if kill and began >= settled_at)
                failed = [row for row in rows if row[0] != 200]
                print(json.dumps({'requests': len(rows), 'status': codes, 'gateways': backends,
                                  'p95_ms': p95, 'settled_successes': settled[200, 'b'], 'failed': len(failed)}))
                return codes, backends, settled

            baseline, targets, _ = burst(4)
            assert set(baseline) == {200} and set(targets) == {'a', 'b'}
            _, _, settled = burst(5, kill=True)
            assert set(settled) == {(200, 'b')}, settled
            for _ in range(10):
                recovered = http.get(room, headers=guest)
                assert recovered.status_code == 200 and recovered.headers['x-qa-backend'] == 'b'
            assert http.post(room, headers=guest, json=message).json() == original.json()
            assert len(http.get(room, headers=guest).json()) == 1
            assert http.post('/ticket/book', headers=guest, json=booking).json()[0]['id'] == ticket
            assert len(http.get(f'/ticket/user/{attendee}', headers=guest).json()) == 1
            if stack_failover:
                new_attendee, new_guest = account(http, 'after-cutover')
                created = http.post('/event', headers=owner,
                                    json={**event_payload, 'title': 'Published on surviving stack'})
                assert created.status_code == 201
                new_event = created.json()['id']
                new_booking = http.post('/ticket/book', headers=new_guest, json={
                    'event_id': new_event, 'user_id': new_attendee, 'quantity': 1, 'request_id': str(uuid4()),
                })
                assert new_booking.status_code == 201
                new_message = http.post(f'/event/{new_event}/messages', headers=new_guest,
                                        json={'content': 'Sent on surviving stack', 'request_id': str(uuid4())})
                assert new_message.status_code == 201
                for name in services:
                    restart_core(name)
            application(port_a, 'gateway-a-restarted', 'backend/gateway', env)
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                result = http.get(f'/event/{new_event}/messages' if stack_failover else room,
                                  headers=new_guest if stack_failover else guest)
                assert result.status_code == 200
                if result.headers['x-qa-backend'] == 'a':
                    if stack_failover:
                        [stored_message] = result.json()
                        assert stored_message['id'] == new_message.json()['id']
                        assert stored_message['sender_id'] == new_attendee
                        assert stored_message['content'] == 'Sent on surviving stack'
                    break
                time.sleep(.1)
            else:
                pytest.fail('Recovered gateway did not rejoin the pool')
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=10)
