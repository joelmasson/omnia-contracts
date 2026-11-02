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
