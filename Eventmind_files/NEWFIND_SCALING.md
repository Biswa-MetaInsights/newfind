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
