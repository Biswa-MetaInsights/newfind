from copy import deepcopy
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from backend.services.event.app.models.event import Base, Event, EventStatus
from backend.shared.openagenda import Client, ProviderError, normalize_event
from backend.scripts.sync_openagenda import sync

NOW = datetime(2026, 11, 11, 12, tzinfo=timezone.utc)


def fixture():
    return {'uid': 123456, 'state': 2, 'status': 1, 'title': {'fr': 'Atelier culturel', 'en': 'Cultural workshop'},
            'description': {'fr': 'Description publique'}, 'updatedAt': '2026-11-10T08:00:00Z',
            'timezone': 'Europe/Brussels', 'originAgenda': {'slug': 'test-agenda'}, 'slug': 'cultural-workshop',
            'timings': [{'begin': '2026-11-10T10:00:00+01:00', 'end': '2026-11-10T12:00:00+01:00'},
                        {'begin': '2026-11-12T10:00:00+01:00', 'end': '2026-11-12T12:00:00+01:00'}],
            'location': {'name': 'Public venue', 'city': 'Tournai', 'countryCode': 'BE',
                         'latitude': 50.60, 'longitude': 3.38},
            'rights': {'license': {'id': 'etalab-2.0', 'name': 'Licence Ouverte 2.0'},
                       'licensor': {'name': 'Test publisher'}},
            'image': {'base': 'https://img.openagenda.com/main/', 'filename': 'test.jpg'},
            'imageCredits': 'Photographer'}


def test_next_slot_utc_provenance_and_unknown_price():
    data = normalize_event(fixture(), 42, now=NOW)
    assert data['start_date'] == datetime(2026, 11, 12, 9)
    assert data['timezone'] == 'Europe/Brussels'
    assert data['location']['city'] == 'Tournai'
    assert data['source'] == 'openagenda' and data['external_id'] == '123456'
    assert 'Test publisher' in data['description'] and '2026-11-10' in data['description']
    assert 'Licence Ouverte 2.0' in data['description']
    assert data['image_url'] is None  # No uncredited photographs on cards.
    assert data['event_website'].startswith('https://openagenda.com/test-agenda/events/123456_')


@pytest.mark.parametrize('change', [
    {'state': 0}, {'private': 1}, {'removed': True}, {'rights': {}},
    {'rights': {'license': {'id': 'unknown'}, 'licensor': {'name': 'Test'}}},
    {'timings': []}, {'updatedAt': None}, {'attendanceMode': 2}, {'status': 3},
    {'location': {'latitude': float('nan'), 'longitude': 3}},
    {'location': {'latitude': 91, 'longitude': 3}},
])
def test_unpublishable_events_are_excluded(change):
    assert normalize_event({**fixture(), **change}, 42, now=NOW) is None


def test_key_and_cursor_pagination():
    with pytest.raises(ValueError):
        Client('oa_sk_not_a_public_key')
    client = Client('oa_pk_local_test', pause=lambda _: None)
    calls = []
    def get(path, params):
        calls.append(deepcopy(params))
        return {'events': [fixture()], 'after': ['cursor', 1] if len(calls) == 1 else None}
    client.get = get
    assert len(list(client.events(42))) == 2
    assert calls[1]['after[]'] == ['cursor', 1]
    assert calls[0]['state'] == 2 and 'key' not in calls[0]


def test_real_database_upsert_cancellation_and_removed_listing():
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    class FakeClient:
        raw = fixture()
        listed = True
        missing = False
        def events(self, agenda, pages):
            return [self.raw, self.raw] if self.listed else []
        def event(self, agenda, uid):
            if self.missing:
                raise ProviderError(404)
            return self.raw
    client = FakeClient()
    with Session(engine) as db:
        stats = sync(client, [42], session=db, event_model=Event, now=NOW)
        first = db.query(Event).one()
        first_id = first.id
        assert stats['saved'] == 1 and first.status == EventStatus.PUBLISHED
        assert first.organization_name == 'Test publisher'
        client.raw = {**fixture(), 'status': 6}
        sync(client, [42], session=db, event_model=Event, now=NOW)
        db.expire_all()
        assert db.query(Event).one().id == first_id
        assert db.query(Event).one().status == EventStatus.CANCELLED
        # A row absent from a bounded results page must be checked separately.
        client.listed = False
        client.raw = fixture()
        sync(client, [42], session=db, event_model=Event, now=NOW)
        db.expire_all()
        assert db.query(Event).one().visibility == 'public'
        client.missing = True
        sync(client, [42], session=db, event_model=Event, now=NOW)
        db.expire_all()
        assert db.query(Event).one().visibility == 'private'


def test_dry_run_never_needs_database():
    class FakeClient:
        def events(self, agenda, pages):
            return [fixture()]
    stats = sync(FakeClient(), [42], now=NOW)
    assert stats['eligible'] == 1 and stats['saved'] == 0 and stats['dry_run']
