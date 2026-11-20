# OMNIA contracts

Shared **build-time** contracts for independently deployed OMNIA services on
Ubuntu Server. JSON Schema 2020-12 is canonical; OpenAPI 3.1 references the same
schemas. This is not a shared service, SDK runtime, database or message broker.
The repository is initially empty of application code by design.

## Layout

| Location | Contents |
| --- | --- |
| [schemas/](./schemas/) | Domain, SERVITOR health, Deployment Domain, ARCHIVIST execution, and Ice IQ feed contracts |
| [events/](./events/) | Envelope, job and service event contracts, and a supported-event union |
| [openapi/](./openapi/) | Optional health, event, and Ice IQ feed API capabilities |
| [typescript/](./typescript/) | Generated types, generation tooling and Node.js Zod adapter examples |
| [examples/](./examples/) | One JSON fixture per resource/event and a runnable consumer |
| [tests/](./tests/) | Schema, fixture, negative, OpenAPI and TypeScript checks |
| [.github/workflows/](./.github/workflows/) | Validation on Node.js 22 and 24 |
| [docs/adr/](./docs/adr/) | Ownership, compatibility, and Deployment Domain decisions |
| [docs/servitor-health-profile.md](./docs/servitor-health-profile.md) | SERVITOR health profile semantics, freshness, and offline pinning |

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
The adapter may implement consumer-side semantic checks, but it is only an
example and is not their authority. Generated TypeScript types are structural
and do not enforce numeric bounds or these semantic rules.
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
- Health `timestamp` identifies when the snapshot was produced;
  `lastSuccessfulCheck` is the latest successful check time or `null` when no
  check has succeeded. If absent, the producer has not reported it. It is
  optional for compatibility with older producers.
  Consumers must apply their own freshness threshold to `timestamp` (and, where
  relevant, `lastSuccessfulCheck`): a stale report, even one whose status is
  `healthy`, does not establish current service health. Stale observations must
  remain distinguishable from current observations.
- SERVITOR's health profile is a named strict exception to extensible health
  snapshots: it uses the shared HealthStatus v1 schema, pins one
  `operationsMcp` readiness check, and rejects unknown fields. Its exact status,
  freshness, and clock-skew rules are documented in
  [the SERVITOR profile](./docs/servitor-health-profile.md).
- Incident severity: `critical`, `high`, `medium`, `low`, `info`; incident status:
  `open`, `acknowledged`, `resolved`. The legacy MAGOS deployment snapshot and
  backup status use `started`, `completed`, `failed`. Deployment Domain execution
  status is separately `queued`, `running`, `succeeded`, `failed`, `cancelled`.
  Backup type is `full` (all selected data),
  `incremental` (changes since the preceding backup), `differential` (changes
  since the latest full backup) or `snapshot` (a point-in-time image). Encryption
  algorithms are `AES-256-GCM` (authenticated AES-GCM) or `ChaCha20-Poly1305`
  (authenticated stream encryption). `encryptionAlgorithm` names the algorithm
  only; backup metadata and failure information must never contain credentials,
  keys or other encryption secrets. Backup verification is independently
  `pending`, `verified`, `failed` or `not_requested`; completion does not imply
  verification. A verified backup requires `verifiedAt` and a checksum. A
  verification failure leaves the backup `completed` and records structured
  failure data including a non-secret failure reference; a backup operation
  failure has `status: "failed"`.
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

### Approved operational integration direction

The [OMNIA architecture decision register](https://github.com/joelmasson/omnia-magos/blob/main/docs/architecture/operational-data-model.md)
records the approved generic job events and Ice IQ feed design. This Contracts
phase defines their schemas and OpenAPI surface only; it does not implement
producers, persistence, authentication, polling, or application endpoints.

The approved direction keeps the existing common event envelope unchanged and
adds five initial `1.0.0` job event schemas (`job.started`, `job.progress`,
`job.warning`, `job.completed`, and `job.failed`) and Ice IQ feed API schemas.
New job payloads use strict validation, rejecting unknown payload properties;
this is specific to those payloads and does not change the existing extensible
envelope or other current schemas. API versions and event versions are independent.
Contracts releases use immutable Git tags; MAGOS and Ice IQ pin exact releases
and vendor required schemas offline. Runtime schema fetching is not permitted.
Consumer updates require review, unsupported event versions are rejected,
historical schemas remain available, and old and new major versions coexist
during a migration window.

For Ice IQ, execution `sequence` is persistence order within an execution,
`stageIndex` is the stable catalog position (not execution order; the first six
stages may run concurrently), and `feedPosition` is global outbox order.
Successful insertion assigns sequence and feed position atomically; failed
writes consume neither. Sequence 1 is `job.started`.
The producer durably preserves the original start information, including its
actual timestamp, and queues later events behind it until it can persist the
start first. If that information cannot be recovered, report incomplete
history, never fabricate a start. Reporting failures do not block NHL sync.
`job.started` has sequence 1; all subsequent event types have sequence greater
than 1.

The feed is `GET /api/ops/v1/events?after={position}&limit={limit}`. `after=0`
starts a read; `limit` defaults to 100 and cannot exceed 100. Events are
returned in ascending `feedPosition` order. An empty feed is `200` with
`events: []` and `hasMore: false`. `hasMore: true` means more events existed
beyond the returned batch when the response was generated; `false` means none
existed then. Events arriving afterward are picked up by the next poll.
Serialized event size is limited to 16 KiB
and response size to 2 MiB, measured in UTF-8 bytes; oversized events are never
truncated or silently omitted. Invalid, unsafe, fractional, negative, or future
cursors and invalid or over-limit limits receive `400`; no error body is
specified.

MAGOS posts `highestContiguousFeedPosition` to
`POST /api/ops/v1/events/ack` and acknowledges only the highest contiguous feed
position proved durably accepted; acknowledgement is not proof of projection
and does not authorize deletion. On cursor loss or disagreement, acknowledgement
stops while the persisted Ice IQ acknowledgement is compared with MAGOS's
durable accepted history. Recovery is limited to the highest provably accepted
contiguous position; disagreement or missing, inconsistent, or unexplained gaps
require operator intervention. Never automatically reset to zero, jump to the
latest position, skip evidence, or acknowledge unproven acceptance. Forward-only producer
acknowledgements cannot be assumed reversible. `204 No Content` confirms that
the acknowledgement was accepted, not that any outbox records were deleted.
Ice IQ outbox and MAGOS immutable event history have no automatic deletion
under the initial policy. The contracts do not define authentication mechanics.

### Mandatory consumer-side semantic validation

Consumers in every implementation language and with every validation library
must apply these checks in addition to JSON Schema validation:

- For `job.progress`, `stageIndex` must not exceed `stageCount`.
- For `job.completed`, `stagesCompleted + stagesFailed` must not exceed the
  execution's established `stageCount`. Because this depends on execution
  history, validate it against persisted execution history; do not assume the
  event can be validated in isolation.
- In `job.failed`, `recordsProcessed` is the count accumulated by `failedStage`
  at failure, not the execution-wide total; it may appear only with
  `failedStage`, and should be omitted if the stage or count is not reliable.
  `totalRecordsProcessed` is the aggregate execution-level count up to failure,
  not a stage count. It may be omitted if it cannot be reliably calculated and
  does not imply a count of unique records or entities unless the producer
  explicitly guarantees that property.

JSON Schema remains authoritative for constraints it can express directly.
Zod validation may implement these semantic checks, but Zod is not their sole
authority. Other feed-state rules, including cursor monotonicity, rejecting
future cursors, and ascending feed order, likewise require validation against
feed state.

The approved MAGOS operational API direction distinguishes durable acceptance
from successful projection and exposes projection/recovery health separately
from the producer-reported outcome. Bounded automatic projection retries may
end in `needs_recovery`; only an authenticated operator may request MAGOS
replay, not producers or SERVITOR independently. The operator API, its wire
schema and authentication are not implemented or published by these decisions.
The existing generic `/events` capability and envelope remain unchanged.

The supported-event union and examples include the five job events. The OpenAPI
feed paths define contract shapes only; no application endpoint or operational
authorization is implied.

Each event requires `eventId`, `eventType`, `eventVersion`, `timestamp`, `source`,
`correlationId` and `payload`. `eventVersion` is a strict SemVer 2.0.0 value
defined as a constant by each event schema, independently versioned per
`eventType`; the shared envelope accepts any valid semantic version. The `vN`
event schema filename suffix and `$id` follow the major component of that
event's wire version. Current event versions are shown in the table; additive
changes may use a compatible minor version, while incompatible wire changes
require a new major schema and a migration window.
`correlationId` is a producer-created workflow identifier propagated across
related operations; `eventId` identifies one immutable event and is reused
when retrying that event.

| Event | Version | Payload | Additional requirements |
| --- | --- | --- | --- |
| `service.health.changed` | `1.1.0` | HealthStatus | Any defined health status |
| `service.unavailable` | `1.0.0` | HealthStatus | `unhealthy` or `unknown` |
| `incident.created` | `1.0.0` | Incident | `open` |
| `incident.resolved` | `1.0.0` | Incident | `resolved`, `resolvedAt` |
| `deployment.started` | `1.0.0` | Deployment | `started` |
| `deployment.completed` | `1.0.0` | Deployment | `completed`, `completedAt` |
| `deployment.failed` | `1.0.0` | Deployment | `failed`, `completedAt` |
| `backup.started` | `1.0.0` | Backup | `started`, verification `pending` |
| `backup.completed` | `1.1.0` | Backup | `completed`, `completedAt`, `sizeBytes`, `checksum`, verification `pending` or `not_requested` |
| `backup.failed` | `1.0.0` | Backup | `failed`, `startedAt`, verification `not_requested`, structured failure reference; no completed artifact is implied |
| `backup.verified` | `1.0.0` | Backup | `completed`, verification `verified`, `verifiedAt`, `checksum` |
| `backup.verification.failed` | `1.0.0` | Backup | `completed`, verification `failed`, structured failure reference |
| `agent.task.started` | `1.0.0` | AgentTask | `started`, `startedAt` |
| `agent.task.completed` | `1.0.0` | AgentTask | `completed`, `startedAt`, `completedAt`, `result` |
| `agent.task.failed` | `1.0.0` | AgentTask | `failed`, `completedAt`, `error`; may fail before starting |
| `job.started` | `1.0.0` | Strict job payload | `trigger`, job key, execution ID, sequence |
| `job.progress` | `1.0.0` | Strict job payload | Stage, catalog index/count, `started` or `completed` |
| `job.warning` | `1.0.0` | Strict job payload | Stage, stable producer-owned warning code |
| `job.completed` | `1.0.0` | Strict job payload | `complete`, completed/failed stage totals |
| `job.failed` | `1.0.0` | Strict job payload | `failed`, stable failure code; optional stage-level and execution-level record counts |

Unavailable observations use `null` for never-observed uptime, or the last
observed uptime with an `uptimeObservedAt` detail when stale; do not invent a
zero uptime.

When verification is requested, the valid backup lifecycle paths are
`backup.started` → `backup.completed` → `backup.verified` and
`backup.started` → `backup.completed` → `backup.verification.failed`.
`backup.started` → `backup.failed` is the operation-failure path.
`backup.failed` has `status: "failed"`, requires `startedAt`, structured failure
information and verification status `not_requested`; it does not require
`completedAt` and does not imply a completed artifact. Backup completion
records that the operation finished; it does not assert verification.
Both operation and verification failures carry structured, non-secret failure
references.
`backup.completed` may use verification status `pending` or `not_requested`.
When verification is requested, a later `backup.verified` records success,
while `backup.verification.failed` records an unsuccessful integrity check
without changing the backup operation's `completed` status. If verification is
`not_requested`, `backup.completed` is terminal and no verification event is
expected.

JSON Schema validates each event independently; it cannot establish event
ordering or validate transitions across a history. ARCHIVIST must correlate
events by backup ID and enforce these lifecycle transitions across events.

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
| Existing deployment snapshot and lifecycle events | MAGOS |
| Deployment request and execution contracts | OMNIA Deployment Domain; each application repository owns its workflow and adapter |
| Backup | ARCHIVIST |
| Agent task | SERVITOR |
| Envelope, compatibility and OpenAPI conventions | OMNIA platform maintainers with affected consumers |

Ice IQ owns its application data and references these contracts at integration
boundaries only. MAGOS may display NOOSPHERE observations, but **NOOSPHERE never
depends on MAGOS** for startup, health probes, supervision or local recovery.
Registration is a data contract, not a mandated central registry or registration
HTTP API. Capability paths do not require every service to implement every path.
Each service retains its own database, runtime, pipeline and release cadence.
See [ADR 0001](./docs/adr/0001-schema-ownership-and-compatibility.md) and
[ADR 0002](./docs/adr/0002-omnia-deployment-domain.md).

## Deployment Domain contracts

The versioned [deployment request](./schemas/deployment-request.v1.schema.json)
and [execution status](./schemas/deployment-execution.v1.schema.json) are
separate from the existing MAGOS-owned
[deployment snapshot](./schemas/deployment.v1.schema.json) and
`deployment.started`, `deployment.completed`, and `deployment.failed` events.
The new schemas use `contractVersion: "1.0.0"` and `v1` identifiers; consumers
must reject unsupported versions and opt into these contracts explicitly.
They are additive and do not alter the accepted shape of existing deployment
records, events, or event versions.

Requests identify a service/repository, environment name and tier, logical
target, requested operation, adapter, artifact locator plus mandatory SHA-256
digest, source repository and commit, release version, authorization, migration
safeguards, and rollback metadata. Source repository identifies where the
commit came from and need not be the deployment repository. The environment
tier is an explicit enum so custom names such as `prod` cannot bypass production
approval requirements.

Production or otherwise approval-required requests carry an approval record
reference and a SHA-256 approval-scope digest in addition to the claimed
approver and timestamp. These values are audit metadata, not proof: a trusted
workflow must authenticate the actor, retrieve and validate the approval record,
and verify the scope digest before deployment. The digest covers the RFC 8785
JSON Canonicalization Scheme representation of the full request with
`authorization` replaced by its `requestId`, `initiatedBy`, and
`approvalRequired` fields. Thus approval binds to the request's artifact,
service, environment, target, operation, migration, rollback and extension
fields. JSON Schema cannot verify the approval provider, human identity,
permissions, or the digest's correspondence to the request.

Database migrations require explicit approval; requests also declare
backward-compatibility and backup/restore preflight requirements. Execution
records identify the GitHub Actions run and lifecycle status, preflight and
health verification, deployed version and actual deployed artifact digest,
failures, and application rollback outcome. A consumer must compare successful
execution identity, workflow repository and deployed digest with the request
using `isDeploymentExecutionConsistentWithRequest`; the workflow run URL alone
is not artifact provenance. A successful rollback operation requires a
successful rollback outcome and must attest the prior artifact digest.
Application rollback does not roll back database state.

The adapter vocabulary includes `docker-compose`, `node-systemd`, and
`application-specific`; deployment targets remain logical and do not prescribe
containers or hosts. Initial examples cover MAGOS and Ice IQ's current Docker
Compose model and ARCHIVIST's Node.js/systemd model; Operations MCP and
STRATEGIUM deployment models remain to be established. These are contract
examples only: this repository adds no deployment workflow, credentials,
runner, infrastructure configuration, or execution service.

The generated [TypeScript contracts](./typescript/contracts.ts) and Ajv-backed
[validators](./typescript/validators.ts) derive from the canonical schemas.
JSON Schema validates an individual execution snapshot; consumers must also
enforce lifecycle transitions: `queued` → `running` or `cancelled`, and
`running` → `succeeded`, `failed`, or `cancelled`. Terminal states do not
transition; retries use a new deployment identity. The validator helper
`isValidDeploymentStatusTransition` exposes this rule.

The current request and execution v1 schemas are pre-adoption drafts. Their
approval-evidence reference/scope digest, source-repository identity and
successful deployed-artifact digest are required for new consumers. Do not mix
these draft requirements with an earlier untagged snapshot; update validators
and producers together before adoption. Once adopted or released, incompatible
changes follow the major-version coexistence and migration policy below.

## Versioning and contribution standards

- Repository releases use SemVer tags (`v0.1.0` initially). Before `1.0.0`,
  breaking draft changes require a minor bump and explicit migration notes;
  patches remain compatible. After `1.0.0`, breaking changes require a major bump.
- File suffix `v1` and `$id` identify a schema major. Never repurpose an existing
  identifier for an incompatible contract, even during draft development.
  New incompatible schemas/events coexist under `v2`, with a migration window.
- Deployment request and execution wire versions are independent of repository
  release tags. Their current `contractVersion` is `1.0.0`; incompatible changes
  require new `v2` schema identifiers while v1 remains available during consumer
  migration. Optional additive fields follow the existing extensible-schema
  policy; required-field additions and constraint or enum changes require
  compatibility review.
- An optional additive property is generally a minor change because consumers
  of existing extensible schemas tolerate unknown fields. The approved future
  job payloads are strict, so additive payload fields require explicit
  versioning and compatibility review rather than assuming old consumers
  tolerate them. Adding required fields, removing or renaming properties,
  narrowing constraints, and adding/removing enum values are breaking changes
  (exhaustive consumers may depend on the old enum).
- Corrections to documentation/examples without changing accepted data are
  patches. Relaxing constraints still needs consumer review: new producers may
  emit data an old consumer rejects. Do not assume it is automatically compatible.
- New event kinds require explicit consumer opt-in; old subscriptions need not
  accept them. Each event's exact `eventVersion` is negotiated by adoption.
  Each event schema pins its own `eventVersion` constant. Consumers must reject
  unsupported event major versions rather than guessing, downgrading, or
  interpreting an unknown major as compatible. When changing a wire
  event, create an explicit new version/schema and preserve supported older
  variants; do not silently change that event's discriminator. The shared
  envelope only checks that the version is valid SemVer. Consumers may receive
  different versions for different event types.
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


## ARCHIVIST execution reporting

ARCHIVIST owns the `archivist.execution.completed` event (wire version
`1.0.0`). It is a terminal summary for one ARCHIVIST command, delivered through
the existing durable event-feed pattern. `eventId` identifies the immutable
delivery record; `payload.executionId` identifies the command execution and
is also the event correlation ID.

The payload supports `init`, `backup`, `verify`, `restore`, and
`retention-plan`. A successful command means only that command completed:
successful `retention-plan` is not a backup, successful `verify` is not a
new backup, and successful `restore` is not automatically a scheduled restore
test. Consumers must interpret `command` and `status` together.

Only sanitized summaries cross the boundary. Do not include repository
identifiers, credentials, raw paths, snapshot IDs, database hashes, raw
retention-plan snapshot lists, database contents, or raw subprocess output.
Retention details are counts only. Failure messages and external diagnostics
must remain sanitized and bounded.

A terminal execution event does not by itself prove that every reporting
consumer has projected it. Producers durably preserve events in an outbox,
reuse the same `eventId` on delivery retries, and retain records until their
feed acknowledgement policy permits archival. Consumers deduplicate by
`eventId`; acknowledgement proves durable acceptance only, not successful
projection. Missing reports and stale observations remain unknown.

The event schema validates structure. ARCHIVIST additionally owns semantic
checks: execution IDs are unique; timestamps are ordered; the event is emitted
only after the local execution report is durably persisted; a failure outcome
contains an error; and a successful outcome does not. Consumers must not infer
backup verification or restore-test status from unrelated command outcomes.
