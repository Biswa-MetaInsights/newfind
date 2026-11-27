# NewFind capacity and failover

## Verified changes

The gateway uses the existing private Redis service for one rate-limit budget across gateway instances in Docker Compose. Run `backend/tests/test_gateway_replicas.py` with a local `redis-server` on PATH to verify that a request counted by one process is also counted by the other and that the budget survives a gateway restart. The test starts its own temporary Redis instance. Run the core integration suite for event creation, booking, QR check-in, chat and unread counts.

The event room list fetches unread counts in a grouped query instead of counting each room separately. The companion frontend change slows room-list refreshes to 30 seconds and quiet conversations to 15 seconds. Active conversations still refresh every five seconds. Opening older pages pauses periodic refresh, with a manual refresh control available.

## Low-cost staging rollout

1. Run open-source HAProxy on a staging host and place two NewFind gateway instances behind it. Use private networking for targets and keep the gateway's current TLS and client identity trust boundary intact. Configure application health checks for each target and confirm failed instances stop receiving traffic. Start with gateway replicas, then add event and ticketing replicas using the same Postgres databases and Redis instance. Run one scheduler for event imports and one outbox worker until their jobs have explicit shared ownership.
2. Keep PostgreSQL connection pools within the total database budget across all replicas. Measure slow event search and chat queries using PostgreSQL statistics before adding indexes or caches. Use integer IDs or user-scoped keys for private reads and preserve authorization on every instance.
3. Exercise anonymous discovery, sign-in, two-role chat, concurrent purchase attempts for the final free seat, cancellation, and check-in using an open-source k6 or Locust staging load test. Drive chat polling at measured browser rates. Inspect p95 latency, errors, CPU, RAM, database connections, Redis usage and duplicate records. Remove one gateway during peak load and verify remaining capacity and retry behavior. Record the highest sustained load meeting the service targets.
4. Plan recovery beyond the current host. Several processes on one machine can survive a process restart, while a host outage needs a gateway on another host. Keep encrypted off-host PostgreSQL backups with restic and verify restoration. A single shared database or Redis server remains a dependency for the replicated gateways. For a service availability target that requires data-layer failover, validate that separately before production rollout.

Keep the Hetzner deployment and unrelated services outside the staging benchmark. Actual production capacity remains unmeasured until the staging mix and the deployed host resources have been verified.

## Isolated regression evidence

The HAProxy test uses two gateway processes, shared Redis, and the real authentication, user, event and ticketing APIs. With PostgreSQL enabled, two attendees race for one ticket. Exactly one succeeds. The winning attendee can retrieve their QR code and post in the event room. Replaying the booking and message requests after the gateway stops returns the originals, and the restarted gateway rejoins the pool.

| Database | Baseline successes | Successes during the fault run | Requests interrupted at cutover | Requests after the one-second cutover window | Baseline / fault p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| PostgreSQL 15 | 840/840 | 1,046/1,048 | 2 | 527/527 | 33.2 / 37.2 ms |
| SQLite | 850/850 | 1,032/1,033 | 1 | 504/504 | 34.7 / 43.3 ms |

Both runs used 16 concurrent workers and four read endpoints over a four-second baseline and five-second fault run. These measurements reflect loopback traffic and process failure. Multi-host network traffic, production data distribution, shared dependency failover and sustained capacity require separate tests.

Run `python -m pytest backend/tests -q -s` with the backend test dependencies installed. Use local HAProxy and Redis executables on PATH or set `NEWFIND_TEST_HAPROXY` and `NEWFIND_TEST_REDIS_SERVER`. Set `NEWFIND_TEST_POSTGRES_BIN` to the directory containing `initdb` and `postgres` and `NEWFIND_TEST_RESTIC` to a verified restic executable to include both optional checks. The restic check verifies encryption and file restore with synthetic dumps, including rejection of an incorrect password. A database restore on a clean host is a separate acceptance check.

## Target production architecture

| Layer | Design | Acceptance check |
| --- | --- | --- |
| Ingress and API | Route public traffic through redundant HAProxy endpoints with provider-supported health-checked ingress failover. Run at least two gateways and critical API replicas across separate hosts. Keep the frontend and static assets behind the existing CDN. | Remove either gateway, an application host, and an ingress endpoint during separate drills. Confirm the surviving path sustains forecast peak traffic and private responses bypass the CDN cache. |
| Bookings and chat | Keep bookings, memberships, moderation and message history authoritative in PostgreSQL. Use server-side room authorization, request IDs for retried writes and bounded, jittered chat polling. Keep the same room ID across deploys and replicas. | Race bookings for the final seat. Replay interrupted requests. Confirm one ticket per booking request, one message per message request and room access limited to the organiser and eligible attendees. |
| PostgreSQL | Budget connections across replicas and add PgBouncer when needed. Put a standby on another host, route write connections to the current primary, and fence the old primary before promoting a standby. Validate a quorum-based failover option such as Patroni before enabling automatic promotion. | Force primary loss and test connection recovery, write consistency and replication lag. Measure recovery and data loss. |
| Redis | Share the rate-limit state across gateways. Keep it on a private network and test the application during Redis loss. Add replication and Sentinel-aware clients if Redis availability is required for core traffic. | Stop Redis and exercise sign-in, booking and chat. Validate the selected outage policy, connection recovery and a shared rate limit after failover. |
| Background work | Run imports, notifications and other scheduled jobs with shared ownership and idempotent processing before adding active workers. Place workloads behind queues or concurrency limits so imports cannot exhaust resources needed for booking. | Kill a worker during processing and confirm the replacement resumes work without duplicate effects. Simulate upstream provider throttling. |
| Backups and operations | Keep encrypted snapshots off-host. For tighter data recovery, use off-host PostgreSQL base backups and continuous transaction-log archiving with a tool such as pgBackRest. Monitor with Prometheus and Alertmanager, plus an independent public availability probe. | Restore data to a clean host and verify bookings and room history. Alert on API errors, latency, pool saturation, replica lag, backup age and missed imports. Exercise rollback and verify compatibility with the deployed database schema. |

Start with a second app host, independent ingress health monitoring and off-host backups using the existing stack. Add data-layer redundancy before claiming resilience to a host outage. Budget for the extra compute, storage and network traffic even when the software is open source.

Use a proposed initial service target of 99.9% monthly availability for core journeys, with planning targets of 15 minutes to recover service and 5 minutes of maximum data loss for the database failover scenario. Measure regional disaster restore separately. Confirm targets and size the staging workload before using these numbers as commitments. Include a sustained peak test with one host offline, a longer soak, real-browser tests on mobile and desktop, and an operator-run rollback drill.
