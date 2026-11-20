# SERVITOR health profile v1

This profile constrains the shared
[HealthStatus v1 schema](../schemas/health-status.v1.schema.json) for the
optional SERVITOR readiness endpoint. The canonical profile is
[servitor-health.v1.schema.json](../schemas/servitor-health.v1.schema.json);
the example is [servitor-health.json](../examples/servitor-health.json).
Consumers must validate offline against an immutable Contracts snapshot and
must not fetch schemas at runtime.

## Endpoint and response

SERVITOR serves `GET /health` only from `127.0.0.1`. The report describes
current readiness, not process liveness or a remembered successful startup
check. At assessment time, `operationsMcp` represents the current MCP
connection and the current availability of every required read-only tool.
Startup discovery alone is not evidence of current readiness.

The profile has exactly one check, named `operationsMcp`. A root property-name
allowlist closes the base schema's extensible root object; the check object
rejects additional properties directly. `details` must be empty.
This intentionally prevents credentials, prompts, tool payloads, source data,
paths, raw errors, and other unreviewed content from entering the response.
The profile defines payload shape, not transport authentication. The endpoint
must use the dedicated read-only authentication and loopback boundary required
by the accepted MAGOS ADR-0004. A valid JSON report is interpreted by its
schema-validated status; an HTTP or network failure is not a report and must
remain unknown/unavailable to consumers.

## Status semantics

Only the following three statuses are valid for both the overall report and
its single check; the values must match:

| Status | Meaning |
| --- | --- |
| `healthy` | Initialization is complete, the current MCP connection is confirmed connected, and all required read-only tools are currently available. |
| `unhealthy` | A completed current assessment positively confirms a required condition is not met, including a known disconnected/closed connection or a required tool known to be absent. |
| `unknown` | A current assessment cannot be completed or its result is indeterminate, including before initial assessment or when connection/tool state cannot be established. A timeout or inability to assess is not itself proof of an unhealthy service. |

`degraded` is not part of this v1 profile. SERVITOR has one required readiness
dependency and no approved partial-readiness state. A future contract version
would be needed before defining `degraded`; it must not be used for stale,
unknown, or unreachable conditions.

`timestamp` is the RFC 3339 time of this current assessment. When `status` is
`healthy`, `lastSuccessfulCheck` is that assessment time. For other statuses,
`lastSuccessfulCheck` is the most recent prior assessment that confirmed all
required conditions, or `null` if none has succeeded. `uptime` is elapsed
process seconds or `null` when unavailable.

## Freshness and clock skew

The owner-approved profile limits are:

- Maximum report age: **30 seconds**.
- Maximum producer clock lead: **5 seconds**.

MAGOS evaluates `timestamp` against its UTC clock. A timestamp more than 5
seconds in the future is invalid. A timestamp within that skew allowance is
accepted for clock tolerance and has freshness age zero, while its original
value is retained. A report more than 30 seconds old is stale. Invalid or stale
reports are not current healthy observations; MAGOS reports unknown/unavailable
and retains producer time separately from MAGOS receipt time. These limits
apply to consumer validation and cannot be enforced by JSON Schema alone.

## Compatibility and pinning

The profile uses JSON Schema Draft 2020-12 and composes the shared
`health-status.v1.schema.json` with SERVITOR-specific constraints. The shared
schema allows additive unknown properties for compatibility; this profile
closes that extension point with an explicit property-name allowlist (the base
schema's `additionalProperties: true` would otherwise mark unknown properties
as evaluated). The nested check object independently rejects extra properties.
The profile also narrows both report and check status enums without inventing
health states.

Each producer and consumer must vendor this schema and its referenced base
schema from the same immutable Contracts commit. Record the exact commit SHA,
this profile's SHA-256 digest, and its logical `$id` in the consumer's
documentation/build metadata. Runtime schema retrieval, floating branches,
and implicit profile upgrades are not allowed.
