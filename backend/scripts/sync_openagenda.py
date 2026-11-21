"""Bounded public-calendar import. Dry run by default; runs inside event container.

Supply {"key": "oa_pk_...", "agendas": [uid, ...]} through stdin, never arguments.
--apply explicitly persists listings. No native rows or other providers change.
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from uuid import UUID
from backend.shared.openagenda import Client, DEFAULT_AGENDAS, ProviderError, normalize_event


def sync(client, agendas, *, session=None, event_model=None, pages=5, now=None):
    now = now or datetime.now(timezone.utc)
    stats = {'provider': 'openagenda', 'fetched': 0, 'eligible': 0, 'saved': 0,
             'hidden': 0, 'skipped': 0, 'agendas': list(agendas), 'dry_run': session is None}
    rows = {}
    if session is not None:
        rows = {row.external_id: row for row in session.query(event_model).filter_by(source='openagenda').all()}
    processed = set()

    def process(raw, agenda):
        uid = str(raw.get('uid', ''))
        if not uid.isdigit() or uid in processed:
            return
        processed.add(uid)
        payload = normalize_event(raw, agenda, now=now)
        existing = rows.get(uid)
        if payload is None:
            stats['skipped'] += 1
            if existing is not None:
                existing.visibility = 'private'
                stats['hidden'] += 1
            return
        stats['eligible'] += 1
        if session is None:
            return
        payload['status'] = event_model.status.type.enum_class(payload['status'])
        payload['organizer_id'] = UUID(payload['organizer_id'])
        if existing is None:
            existing = event_model(**payload, slug='openagenda-' + uid)
            session.add(existing)
            rows[uid] = existing
        else:
            for key, value in payload.items():
                setattr(existing, key, value)
        stats['saved'] += 1

    for agenda in agendas:
        for raw in client.events(agenda, pages=pages):
            stats['fetched'] += 1
            process(raw, agenda)
    # A bounded search page is NOT evidence of removal. Revalidate stored rows
    # individually, including ones no longer returned in current/upcoming feeds.
    for uid, row in list(rows.items()):
        if uid in processed:
            continue
        agenda = ((row.content_generated or {}).get('openagenda') or {}).get('agenda_uid')
        if agenda not in agendas:
            continue
        try:
            raw = client.event(agenda, uid)
        except ProviderError as error:
            if error.status not in (403, 404, 410):
                raise
            raw = {'uid': uid, 'removed': True}
        process(raw, agenda)
    if session is not None:
        session.commit()
    return stats


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--pages', type=int, default=5, choices=range(1, 11))
    args = parser.parse_args()
    config = json.load(sys.stdin)
    agendas = list(dict.fromkeys(config.get('agendas') or DEFAULT_AGENDAS))
    if not 1 <= len(agendas) <= 10 or any(not str(uid).isdigit() for uid in agendas):
        raise ValueError('Supply one to ten agenda UIDs')
    client = Client(config['key'])
    if args.apply:
        from app.db.session import SessionLocal
        from app.models.event import Event
        with SessionLocal() as session:
            print(json.dumps(sync(client, agendas, session=session, event_model=Event, pages=args.pages)))
    else:
        print(json.dumps(sync(client, agendas, pages=args.pages)))


if __name__ == '__main__':
    try:
        main()
    except (ProviderError, ValueError, KeyError):
        print('OpenAgenda sync stopped; no credentials logged. Check provider access and configuration.', file=sys.stderr)
        raise SystemExit(1)
