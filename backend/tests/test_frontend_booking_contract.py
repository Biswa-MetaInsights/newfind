"""Shipping frontend booking functions exercised against the real isolated services."""
import json
import os
from pathlib import Path
import secrets
from uuid import uuid4
import shutil
import subprocess

from test_core_integration import core

ROOT = Path(__file__).resolve().parents[2]


def test_frontend_booking_is_persistent_idempotent_and_owner_scoped(core):
    client, restart = core

    def account(label):
        details = {'email': f'{label}-{secrets.token_hex(5)}@example.org',
                   'password': secrets.token_urlsafe(20), 'full_name': label}
        registered = client.post('/auth/register', json=details)
        assert registered.status_code == 201
        token = client.post('/auth/login', json=details).json()['access_token']
        return registered.json()['user_id'], token, {'Authorization': 'Bearer ' + token}

    owner, owner_token, owner_headers = account('frontend-owner')
    attendee, token, headers = account('frontend-attendee')
    _, stranger_token, _ = account('frontend-stranger')
    profile = {'full_name': 'Frontend QA', 'company_name': 'QA', 'company_address': 'QA',
               'company_email': 'qa@example.org', 'contact_email': 'qa@example.org', 'country': 'Belgium',
               'registration_number': 'QA', 'bank_name': 'TEST', 'bank_account_number': 'TEST'}
    assert client.post(f'/user/{owner}/organizer', headers=owner_headers, json=profile).status_code == 201
    created = client.post('/event', headers=owner_headers, json={
        'organizer_id': owner, 'title': 'Frontend booking contract', 'description': 'Isolated QA',
        'category': 'Music', 'location': {'latitude': 50.85, 'longitude': 4.35},
        'start_date': '2031-01-01T10:00:00Z', 'end_date': '2031-01-01T12:00:00Z',
        'timezone': 'Europe/Brussels', 'status': 'published', 'capacity': 2, 'price': 0, 'currency': 'EUR'})
    assert created.status_code == 201, created.text
    event_id = created.json()['id']
    request_id = str(uuid4())

    def frontend(action='book', credential=token, quantity=2):
        command = [os.environ.get('CODEX_PRIMARY_RUNTIME_NODE') or shutil.which('node'),
                   str(ROOT / 'frontend_react/apps/web/scripts/booking-contract.mjs')]
        result = subprocess.run(command, input=json.dumps({'origin': str(client.base_url), 'token': credential,
                                'eventId': event_id, 'requestId': request_id, 'quantity': quantity,
                                'action': action}), text=True, capture_output=True, timeout=30)
        return result

    result = frontend()
    assert result.returncode == 0, result.stderr
    first = json.loads(result.stdout)
    assert len(first) == 2 and all(t['event_id'] == event_id and t['currency'] == 'EUR' for t in first)
    assert all(not t['id'].startswith('ticket-') and t['qr_hash'] for t in first)
    assert json.loads(frontend().stdout) == first
    restart('ticketing')
    persisted = json.loads(frontend('load').stdout)
    assert {t['id'] for t in persisted} == {t['id'] for t in first}
    assert json.loads(frontend('load', stranger_token).stdout) == []
    assert frontend(credential=owner_token).returncode != 0
    qr = client.get('/ticket/qr/' + first[0]['id'], headers=headers)
    assert qr.status_code == 200
    assert client.get('/ticket/qr/' + first[0]['id'], headers=owner_headers).status_code in (403, 404)
