# Canonical schemas with domain ownership and offline compatibility

OMNIA services must deploy and recover independently, so shared contracts are
versioned JSON Schema 2020-12 documents consumed from pinned, offline snapshots,
not a shared runtime, writable database, central registry or message broker.
Domain owners approve their payloads (NOOSPHERE: registration/health; MAGOS:
deployment; ARCHIVIST: backup; SERVITOR: agent tasks; reporting services:
incidents), while platform maintainers and affected consumers review envelope
and compatibility changes. NOOSPHERE must remain operational without MAGOS.

OpenAPI 3.1 references canonical schemas, TypeScript types are generated, and
the Zod example delegates to canonical JSON Schema validation rather than
maintaining an independent model. This trades the convenience of a shared SDK
for independent service runtimes and avoids validation drift. Object schemas
accept unknown fields to enable optional additive evolution; incompatible
changes require new major identifiers and a producer/consumer migration window.
Repository release versions and exact event wire versions are independent.
Schema identifiers are logical offline names, not runtime network dependencies.

The shared event envelope validates the SemVer 2.0.0 syntax but does not choose
an event version. Each event schema fixes its own version; its filename suffix
tracks the version's major component. This lets unrelated event types evolve
independently while consumers opt in to exact wire versions.

Backup operation completion and backup verification are separate lifecycle
outcomes. Completion requires `completedAt`; verification success requires
`verifiedAt` and a checksum. Verification failure is reported separately from
backup-operation failure, and both carry structured, non-secret failure
references. A backup-operation failure requires `startedAt`, structured failure
information and verification status `not_requested`, but does not require
`completedAt` or imply a completed artifact. When verification is requested,
the valid history transitions are started → completed → verified and started
→ completed → verification failed; started → failed is the operation-failure
path. A completed backup with verification status `not_requested` is terminal.
JSON Schema validates individual events only; ARCHIVIST owns enforcement of
transitions across event history. Consumers reject unsupported event major
versions. Health snapshots include an optional nullable `lastSuccessfulCheck`;
consumers apply their own freshness threshold to the report timestamp and must
not treat a reported `healthy` value as proof of current health.
