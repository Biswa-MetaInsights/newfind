# visit.brussels event feed sync

This integration is opt-in and is not run by application startup. Review the provider's exact Open Data licence, attribution requirements, image-use terms, request limits and HTTPS support before enabling a production sync.

## Provider endpoints

The provider's emailed PDF documents:

- `/v1/events` for a paginated full import.
- `/v1/events/updates` for events updated in the last 24 hours.
- `/events/deletes?deleted_at_from=<ISO-8601>` for deletion tombstones.
- Event and venue search filters, categories, tags, targets and districts.

The API PDF shows HTTP URLs. The integration defaults to HTTPS and does not silently downgrade. Confirm HTTPS with visit.brussels before running it against production; if HTTPS is unavailable, discuss a safe supported approach with them first.

## Configure and preview

Set these variables in the environment where the sync command runs:

- `EVENT_SERVICE_URL`: internal event service base URL (defaults to `http://localhost:8003`).
- `PROVIDER_SYNC_TOKEN`: a strong secret also configured on the event service. It is required to apply deletion tombstones.
- `AGENDA_BRUSSELS_API_BASE_URL`: defaults to `https://apidata.brussels`.
- `AGENDA_BRUSSELS_DELETE_URL`: defaults to `https://api.agenda.be/events/deletes`.
- `AGENDA_BRUSSELS_STATE_FILE`: durable path for the deletion cursor (defaults to a file under `backend/scripts/.state`).
- `AGENDA_BRUSSELS_ORGANIZER_ID`: optional UUID for the synthetic source organiser.

From the repository root, preview a full import without writing events:

```bash
python backend/scripts/sync_agenda_brussels.py --mode full --dry-run
```

After the data mapping and provider terms are approved, perform the first import:

```bash
python backend/scripts/sync_agenda_brussels.py --mode full
```

Then run incremental syncs on a schedule more frequent than once per day. The provider's updates endpoint only returns the preceding 24 hours; a full sync can be used periodically to recover from missed windows:

```bash
python backend/scripts/sync_agenda_brussels.py --mode incremental
```

The sync upserts on `(source, external_id)`, so repeated runs do not duplicate events. It uses the provider's documented image CDN resizing parameters when available. Deletions are soft-cancelled and require `PROVIDER_SYNC_TOKEN`; if that secret is absent, the sync stops without advancing its checkpoint, so deletions can be replayed after the secret is configured. Keep the state file on durable storage in production.

The command reports records that cannot be normalized and stops without advancing its checkpoint when an event upsert fails. The API response shape should be confirmed against live sample records before production because the provider's documentation does not include a complete JSON schema.
