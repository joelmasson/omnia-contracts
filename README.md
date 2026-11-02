# OMNIA contracts

Shared **build-time** contracts for independently deployed OMNIA services on
Ubuntu Server. JSON Schema 2020-12 is canonical; OpenAPI 3.1 references the same
schemas. This is not a shared service, SDK runtime, database or message broker.
The repository is initially empty of application code by design.

## Layout

| Location | Contents |
| --- | --- |
| [schemas/](./schemas/) | Six domain contracts, major version 1 |
| [events/](./events/) | Envelope, thirteen event contracts and a supported-event union |
| [openapi/](./openapi/) | Optional `GET /health` and `POST /events` API capabilities |
| [typescript/](./typescript/) | Generated types, generation tooling and Node.js Zod adapter examples |
| [examples/](./examples/) | One JSON fixture per resource/event and a runnable consumer |
| [tests/](./tests/) | Schema, fixture, negative, OpenAPI and TypeScript checks |
| [.github/workflows/](./.github/workflows/) | Validation on Node.js 22 and 24 |
| [docs/adr/](./docs/adr/) | Ownership and compatibility decision |

## Local development

Use Node.js 22+ with npm. All dependencies are development tools; there are no
production dependencies and this private package is not published.

```sh
npm ci
npm run generate
npm run validate
npx --no-install tsx examples/validate.ts
```

`validate` checks generated-file freshness, strict TypeScript, every schema and
local reference, examples, invalid data, the Zod adapter and OpenAPI. Commit
the lockfile and generated types. `generate:check` never rewrites files.

## Independent consumption

Pin a repository release tag or commit and vendor the required schema files
**and their referenced files** into each service's own build. TypeScript
consumers may copy [contracts.ts](./typescript/contracts.ts) and use `import type`;
non-TypeScript consumers validate the same JSON Schema with their own tooling.
No service must import another service, fetch schemas at startup, install this
repository at runtime, or share a writable database.

The `$id` values under `https://schemas.omnia.dev/` are stable logical identifiers,
**not a promise of hosted endpoints or domain ownership**. Resolve references
offline from the vendored snapshot; the example preloads all schemas into Ajv
without network fetching. Confirm an owned namespace before a stable release.
Runtime validation requires a service-local validator, not a contracts server.

[validators.ts](./typescript/validators.ts) demonstrates Zod 4 wrappers around
Ajv's canonical schemas, avoiding a second hand-maintained schema definition.
The example is Node.js-only and loads repository JSON files from disk. Copy and
adapt it to your service's bundled assets; it is not a browser-ready SDK.
Unknown fields are preserved and validation errors are reported, not defaulted.

```ts
import type { OmniaEvent } from "./vendor/contracts.js";
// Adapt the example validator to your service's local schema assets.
import { eventSchema } from "./vendor/validators.js";

const event: OmniaEvent = eventSchema.parse(JSON.parse(requestBody));
if (event.eventType === "backup.completed") {
  console.log(event.payload.backupId, event.payload.checksum);
}
```

## Contract rules (initial draft)

- IDs are nonempty opaque strings, not necessarily UUIDs. `source` in the
  envelope identifies the producer; `payload.serviceId` identifies the observed
  service, which may differ (e.g. NOOSPHERE reporting ARCHIVIST unavailable).
- Timestamps are RFC 3339 `date-time` strings with explicit timezone. Producers
  should emit UTC. Uptime is nonnegative elapsed seconds or `null` when never
  observed; sizes are nonnegative
  integer bytes bounded by JavaScript's maximum safe integer.
- `metadata`, `details` and unknown object fields are extensible JSON. Do not put
  secrets, credentials or sensitive model inputs in events, errors or metadata.
  Additive fields must not change the meaning of existing fields.
- Service release `version` is SemVer 2.0.0. Deployment artifact versions,
  environment, category, source, destination and deployment mechanism labels are
  opaque strings; no container, systemd, orchestrator or storage vendor is required.
  Health and API endpoints are absolute HTTP(S) URIs with a nonempty authority
  and no embedded username/password.
- Registration status describes process lifecycle: `starting`, `running`,
  `stopping`, `stopped`, `unknown`. Health is independently `healthy`, `degraded`,
  `unhealthy` or `unknown`. Checks are named health observations.
- Incident severity: `critical`, `high`, `medium`, `low`, `info`; incident status:
  `open`, `acknowledged`, `resolved`. Deployment/backup status: `started`,
  `completed`, `failed`. Backup verification: `pending`, `verified`, `failed`,
  `not_requested`. Completion and verification are separate outcomes.
- Task status: `queued`, `started`, `completed`, `failed`, `cancelled`; priority:
  `low`, `normal`, `high`, `critical`. Results may be any JSON value, including
  explicit `null`; errors contain `code`, `message` and optional `details`.
- Resource snapshots allow lifecycle fields to be absent when unavailable.
  Omit unavailable optional fields rather than sending `null` (except task
  `result`). Event schemas enforce the state-specific requirements below.
- Producers own timestamp ordering, valid state transitions, ID uniqueness,
  checksum correctness and cross-field business rules. Structural validation
  cannot prove these, and TypeScript alone cannot enforce formats or ranges.
  A checksum uses `algorithm:hex`; supported algorithms are ARCHIVIST policy.

## Events

Each event requires `eventId`, `eventType`, `eventVersion`, `timestamp`, `source`,
`correlationId` and `payload`. Set `eventVersion` to **`1.0.0`** for the initial
wire format, independently of the repository's draft release `0.1.0`.
`correlationId` is a producer-created workflow identifier propagated across
related operations; `eventId` identifies one immutable event and is reused
when retrying that event.

| Event | Payload | Additional requirements |
| --- | --- | --- |
| `service.health.changed` | HealthStatus | Any defined health status |
| `service.unavailable` | HealthStatus | `unhealthy` or `unknown` |
| `incident.created` | Incident | `open` |
| `incident.resolved` | Incident | `resolved`, `resolvedAt` |
| `deployment.started` | Deployment | `started` |
| `deployment.completed` | Deployment | `completed`, `completedAt` |
| `deployment.failed` | Deployment | `failed`, `completedAt` |
| `backup.started` | Backup | `started` |
| `backup.completed` | Backup | `completed`, `completedAt`, `sizeBytes`, `checksum` |
| `backup.failed` | Backup | `failed`, `completedAt` |
| `agent.task.started` | AgentTask | `started`, `startedAt` |
| `agent.task.completed` | AgentTask | `completed`, `startedAt`, `completedAt`, `result` |
| `agent.task.failed` | AgentTask | `failed`, `completedAt`, `error`; may fail before starting |

Unavailable observations use `null` for never-observed uptime, or the last
observed uptime with an `uptimeObservedAt` detail when stale; do not invent a
zero uptime.

Events can be sent over direct HTTP; no broker is required or introduced.
The OpenAPI union rejects unknown event names/versions with `422`. A consumer
only needs to implement its subscribed subset and must explicitly reject
unsupported types, not acknowledge and silently drop them. `202` means validated
acceptance, not task completion or durable delivery. Retry budgets, backoff,
timeouts, deduplication retention and ordering are local service policies.
Receivers should deduplicate `eventId` before applying side effects.

## Ownership and boundaries

| Contract | Accountable domain owner |
| --- | --- |
| Registration and health | NOOSPHERE, with every service contributing its own observations |
| Incident | Reporting service owns its incident; NOOSPHERE and MAGOS coordinate vocabulary |
| Deployment | MAGOS |
| Backup | ARCHIVIST |
| Agent task | SERVITOR |
| Envelope, compatibility and OpenAPI conventions | OMNIA platform maintainers with affected consumers |

Ice IQ owns its application data and references these contracts at integration
boundaries only. MAGOS may display NOOSPHERE observations, but **NOOSPHERE never
depends on MAGOS** for startup, health probes, supervision or local recovery.
Registration is a data contract, not a mandated central registry or registration
HTTP API. Capability paths do not require every service to implement every path.
Each service retains its own database, runtime, pipeline and release cadence.
See [ADR 0001](./docs/adr/0001-schema-ownership-and-compatibility.md).

## Versioning and contribution standards

- Repository releases use SemVer tags (`v0.1.0` initially). Before `1.0.0`,
  breaking draft changes require a minor bump and explicit migration notes;
  patches remain compatible. After `1.0.0`, breaking changes require a major bump.
- File suffix `v1` and `$id` identify a schema major. Never repurpose an existing
  identifier for an incompatible contract, even during draft development.
  New incompatible schemas/events coexist under `v2`, with a migration window.
- An optional additive property is generally a minor change because consumers
  must tolerate unknown fields. Adding required fields, removing or renaming
  properties, narrowing constraints, and adding/removing enum values are
  breaking changes (exhaustive consumers may depend on the old enum).
- Corrections to documentation/examples without changing accepted data are
  patches. Relaxing constraints still needs consumer review: new producers may
  emit data an old consumer rejects. Do not assume it is automatically compatible.
- New event kinds require explicit consumer opt-in; old subscriptions need not
  accept them. Each event's exact `eventVersion` is negotiated by adoption.
  When changing a wire event, create an explicit new version/schema and preserve
  supported older variants; do not silently change the `1.0.0` discriminator.
- PRs must state producer/consumer impact, compatibility classification and any
  migration plan. Update canonical schemas first, examples and OpenAPI as needed,
  regenerate types, and add positive and negative tests. Obtain review from
  the domain owner and affected consumers. Never edit generated types manually.
- CI validates structure and synchronized artifacts; it does **not** prove
  historical semantic compatibility. Review changes against the last release.
  No remote publishing or release automation is configured yet.

## Outstanding decisions before adoption

1. Confirm draft domain enums and required lifecycle data with service owners.
2. Confirm schema namespace ownership and release distribution (vendored tags
   initially; no public package or hosted schema registry is configured).
3. Define service-specific authentication, authorization, TLS, discovery and
   capability support; this repository contains no credentials.
4. Define per-integration delivery/retry/deduplication policies and retention.
5. Agree on backup checksum algorithms and verification policy, and whether
   failures need first-class structured errors beyond the task error contract.
