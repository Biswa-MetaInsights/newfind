# OpenAgenda public calendar import

Status: implementation prepared; not deployed or activated. The account's public
key was verified against `/v2/agendas` and three agenda event routes on 11 November
2026. Cross-agenda `/v2/events` returned 403 (`events:transverse` scope required),
so this integration reads selected public calendars, not a worldwide catalogue.

The initial calendars are Métropole Européenne de Lille (89904399),
Eurometropolis Lille-Kortrijk-Tournai (65924599), and Tradlor (77951488).
Event coordinates allow the existing NewFind radius filter to work across borders.
Only published, geolocated listings with `rights.license.id=etalab-2.0`, a named
licensor and an update timestamp are eligible. Dates use the next remaining time
slot and are converted to UTC; the provider's IANA time zone is retained.

Admission prices are not inferred from free-form conditions. External cards direct
visitors to OpenAgenda for details and never advertise the stored zero placeholder
as free admission. Source, licence and source update time appear in the description.
Provider photos are omitted pending consistent image-credit display on all cards.

## Activate on the existing Hetzner checkout

1. Keep `OPENAGENDA_PUBLIC_KEY` in the private root `.env`, mode 600. Only an
   `oa_pk_` key is accepted; no write key is needed. Never pass the key as a shell
   argument, URL query, frontend variable, or Git-tracked file.
2. Back up the event database and deploy this reviewed revision's event image and
   frontend. The importer bypasses Kafka, recommendations and ticket issuance.
3. Run `python3 backend/scripts/sync_openagenda_host.py --check-config`.
4. Run `python3 backend/scripts/sync_openagenda_host.py` for a read-only dry run.
5. Run `python3 backend/scripts/sync_openagenda_host.py --apply` to upsert.
6. Verify `/event/search` and a real event detail page, attribution, date, venue,
   radius filtering and the outbound provider link before reporting it live.

The job reads at most five 100-event pages per calendar by default. Provider UIDs
deduplicate listings across calendars and resyncs. Existing imported rows absent
from a bounded page are rechecked individually; absence from a page never implies
removal. Removed, unpublished, expired, non-geolocated or no-longer-licensed rows
are hidden, and cancelled/full statuses are preserved. Network/provider failures
abort the transaction; they do not authorize deletion or a full-catalogue wipe.
No recurring production schedule has been installed; configure one only after a
successful live import and removal-refresh check.

## Checks

`python -m pytest backend/tests/test_openagenda.py backend/tests/test_ticketmaster_sync.py -q`

`pnpm --filter @eventmind/web type-check` from `frontend_react/`.

Reference: <https://developers.openagenda.com/en/authentification/>,
<https://developers.openagenda.com/en/evenements/lecture/>, and
<https://developers.openagenda.com/en/licence/>.
