import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";
import SwaggerParser from "@apidevtools/swagger-parser";
import {
  ajv,
  serviceRegistrationSchema,
  healthStatusSchema,
  incidentSchema,
  deploymentSchema,
  backupSchema,
  agentTaskSchema,
  eventSchema,
} from "../typescript/validators.js";
import { readJson, root, schemaFiles, schemas, schemaId } from "../typescript/catalog.js";

const resourceValidators = {
  "service-registration": serviceRegistrationSchema,
  "health-status": healthStatusSchema,
  incident: incidentSchema,
  deployment: deploymentSchema,
  backup: backupSchema,
  "agent-task": agentTaskSchema,
};
const eventRequirements = {
  "service.health.changed": [],
  "service.unavailable": [],
  "incident.created": [],
  "incident.resolved": ["resolvedAt"],
  "deployment.started": [],
  "deployment.completed": ["completedAt"],
  "deployment.failed": ["completedAt"],
  "backup.started": ["verificationStatus"],
  "backup.completed": ["completedAt", "sizeBytes", "checksum", "verificationStatus"],
  "backup.failed": ["failure"],
  "backup.verified": ["completedAt", "verificationStatus", "verifiedAt", "checksum"],
  "backup.verification.failed": ["completedAt", "verificationStatus", "failure"],
  "agent.task.started": ["startedAt"],
  "agent.task.completed": ["startedAt", "completedAt", "result"],
  "agent.task.failed": ["completedAt", "error"],
  "job.started": ["jobKey", "executionId", "sequence", "trigger"],
  "job.progress": ["jobKey", "executionId", "sequence", "stage", "stageIndex", "stageCount", "status"],
  "job.warning": ["jobKey", "executionId", "sequence", "stage", "warningCode"],
  "job.completed": ["jobKey", "executionId", "sequence", "status", "stagesCompleted", "stagesFailed"],
  "job.failed": ["jobKey", "executionId", "sequence", "status", "failureCode"],
};
interface EventFixture {
  eventId: string;
  eventType: string;
  eventVersion: string;
  timestamp: string;
  source: string;
  correlationId: string;
  payload: Record<string, unknown>;
}

test("all canonical schemas are valid 2020-12 schemas with unique IDs and resolvable local refs", () => {
  assert.equal(schemaFiles.filter((file) => file.startsWith("schemas/")).length, 9);
  assert.equal(schemaFiles.filter((file) => file.startsWith("events/")).length, 22);
  assert.equal(new Set(schemas.map((schema) => schema.$id)).size, schemas.length);
  for (const [index, schema] of schemas.entries()) {
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(schema.$id, schemaId(schemaFiles[index]));
    assert.ok(ajv.validateSchema(schema), ajv.errorsText());
    assert.ok(ajv.getSchema(schema.$id), `Must compile offline: ${schema.$id}`);
  }
});

for (const [name, zodValidator] of Object.entries(resourceValidators)) {
  test(`${name}: example, required fields and forward-compatible extensions`, () => {
    const example = readJson<Record<string, unknown>>(`examples/${name}.json`);
    const schema = readJson<{ required: string[] }>(`schemas/${name}.v1.schema.json`);
    const validate = ajv.getSchema(schemaId(`schemas/${name}.v1.schema.json`))!;
    assert.ok(validate(example), ajv.errorsText(validate.errors));
    assert.deepEqual(zodValidator.parse(example), example);
    for (const key of schema.required) {
      const invalid = { ...example };
      delete invalid[key];
      assert.equal(validate(invalid), false, `${name}.${key} must be required`);
      assert.equal(zodValidator.safeParse(invalid).success, false);
    }
    const extended = { ...example, futureOptionalField: { enabled: true } };
    assert.deepEqual(zodValidator.parse(extended), extended);
    assert.equal(zodValidator.safeParse(null).success, false);
    assert.equal(zodValidator.safeParse([]).success, false);
  });
}

test("every declared event has exactly one fixture and union membership", () => {
  const expected = Object.keys(eventRequirements).sort();
  const actual = readdirSync(resolve(root, "examples/events"))
    .map((file) => file.replace(/\.json$/, "")).sort();
  assert.deepEqual(actual, expected);
  const union = readJson<{ oneOf: { $ref: string }[] }>("events/event.v1.schema.json");
  assert.deepEqual(union.oneOf.map((item) => item.$ref).sort(),
    expected.map((name) => `./${name}.v1.schema.json`));
});

test("event types carry independent semantic versions", () => {
  const healthChanged = readJson<EventFixture>("examples/events/service.health.changed.json");
  const serviceUnavailable = readJson<EventFixture>("examples/events/service.unavailable.json");
  assert.equal(healthChanged.eventVersion, "1.1.0");
  assert.equal(serviceUnavailable.eventVersion, "1.0.0");
  assert.ok(eventSchema.safeParse(healthChanged).success);
  assert.ok(eventSchema.safeParse(serviceUnavailable).success);
});

test("the shared event envelope accepts only valid semantic version strings", () => {
  const validate = ajv.getSchema(schemaId("events/envelope.v1.schema.json"))!;
  const envelope = {
    eventId: "event-version-check",
    eventType: "example.event",
    eventVersion: "1.0.0",
    timestamp: "2026-11-02T17:00:00Z",
    source: "example",
    correlationId: "correlation-001",
    payload: {},
  };
  for (const eventVersion of ["0.0.0", "1.2.3", "1.2.3-rc.1+build.2"]) {
    assert.equal(validate({ ...envelope, eventVersion }), true, eventVersion);
  }
  for (const eventVersion of ["1.0", "v1.0.0", "01.2.3", "1.0.0-01", "1.0.0+"]) {
    assert.equal(validate({ ...envelope, eventVersion }), false, eventVersion);
  }
});

for (const [name, required] of Object.entries(eventRequirements)) {
  test(`${name}: payload, discriminator, lifecycle and envelope validation`, () => {
    const example = readJson<EventFixture>(`examples/events/${name}.json`);
    const validate = ajv.getSchema(schemaId(`events/${name}.v1.schema.json`))!;
    assert.equal(example.eventType, name);
    const schemaMajor = example.eventVersion.split(".", 1)[0];
    assert.ok(
      readdirSync(resolve(root, "events")).includes(`${name}.v${schemaMajor}.schema.json`),
      "Event schema filename major must match eventVersion",
    );
    assert.ok(validate(example), ajv.errorsText(validate.errors));
    assert.deepEqual(eventSchema.parse(example), example);
    for (const key of ["eventId", "eventType", "eventVersion", "timestamp", "source", "correlationId", "payload"]) {
      const invalid: Record<string, unknown> = { ...example };
      delete invalid[key];
      assert.equal(validate(invalid), false, `Missing ${key}`);
      assert.equal(eventSchema.safeParse(invalid).success, false, `Union missing ${key}`);
    }
    for (const key of required) {
      const invalid = structuredClone(example);
      delete invalid.payload[key];
      assert.equal(validate(invalid), false, `Missing payload.${key}`);
      assert.equal(eventSchema.safeParse(invalid).success, false);
    }
    for (const change of [
      { eventType: "not.supported" },
      { eventVersion: "2.0.0" },
      { eventVersion: 1 },
      { eventVersion: "1.0" },
      { eventVersion: "v1.0.0" },
      { eventVersion: "01.0.0" },
      { eventVersion: "1.0.0-01" },
      { timestamp: "not-a-date" },
      { timestamp: "2026-11-02T17:00:00" },
      { correlationId: "" },
      { payload: {} },
      { payload: { ...example.payload, status: "not-a-state" } },
    ]) {
      assert.equal(validate({ ...example, ...change }), false, JSON.stringify(change));
      assert.equal(eventSchema.safeParse({ ...example, ...change }).success, false);
    }
    if (name !== "service.health.changed") {
      assert.equal(validate({
        ...example,
        payload: { ...example.payload, status: name === "service.unavailable" ? "healthy" : "queued" },
      }), false, "Contradictory event state");
    }
    const extendedEnvelope = { ...example, traceContext: { traceId: "trace-001" } };
    if (name.startsWith("job.")) {
      const extendedPayload = {
        ...extendedEnvelope,
        payload: { ...example.payload, futureOptionalField: true },
      };
      assert.equal(validate(extendedPayload), false, "Job payloads reject unknown properties");
      assert.equal(eventSchema.safeParse(extendedPayload).success, false);
      assert.deepEqual(eventSchema.parse(extendedEnvelope), extendedEnvelope, "Envelope remains extensible");
    } else {
      const extended = {
        ...extendedEnvelope,
        payload: { ...example.payload, futureOptionalField: true },
      };
      assert.deepEqual(eventSchema.parse(extended), extended);
    }
  });
}

test("job event numeric, stage and payload constraints", () => {
  const started = readJson<EventFixture>("examples/events/job.started.json");
  const progress = readJson<EventFixture>("examples/events/job.progress.json");
  const warning = readJson<EventFixture>("examples/events/job.warning.json");
  const completed = readJson<EventFixture>("examples/events/job.completed.json");
  const failed = readJson<EventFixture>("examples/events/job.failed.json");

  const startedValidate = ajv.getSchema(schemaId("events/job.started.v1.schema.json"))!;
  for (const sequence of [1]) {
    assert.equal(startedValidate({ ...started, payload: { ...started.payload, sequence } }), true);
  }
  for (const sequence of [0, 2, -1, 1.5, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(startedValidate({ ...started, payload: { ...started.payload, sequence } }), false);
  }
  for (const trigger of ["cron", "startup", "manual_api", "api_fallback", "dfhl_notifications"]) {
    assert.equal(startedValidate({ ...started, payload: { ...started.payload, trigger } }), true);
  }
  assert.equal(startedValidate({
    ...started,
    payload: { ...started.payload, trigger: "unknown" },
  }), false);
  assert.equal(startedValidate({
    ...started,
    payload: { ...started.payload, sequence: 1.0 },
  }), true, "JSON numeric 1 remains the integer sequence const");

  const progressValidate = ajv.getSchema(schemaId("events/job.progress.v1.schema.json"))!;
  const warningValidate = ajv.getSchema(schemaId("events/job.warning.v1.schema.json"))!;
  const completedValidate = ajv.getSchema(schemaId("events/job.completed.v1.schema.json"))!;
  const sequenceValidators = [
    { name: "job.progress", validate: progressValidate, event: progress },
    { name: "job.warning", validate: warningValidate, event: warning },
    { name: "job.completed", validate: completedValidate, event: completed },
    {
      name: "job.failed",
      validate: ajv.getSchema(schemaId("events/job.failed.v1.schema.json"))!,
      event: failed,
    },
  ];
  for (const { name, validate, event } of sequenceValidators) {
    for (const sequence of [2, Number.MAX_SAFE_INTEGER]) {
      assert.equal(validate({
        ...event,
        payload: { ...event.payload, sequence },
      }), true, `${name} sequence ${sequence}`);
    }
    for (const sequence of [1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(validate({
        ...event,
        payload: { ...event.payload, sequence },
      }), false, `${name} sequence ${sequence}`);
    }
  }
  const stageNames = [
    "nhle", "moneypuck", "nst", "skater-stats", "goalie-stats", "goalie-starts",
    "goalie-storage", "player-storage", "standings", "schedule", "goalie-coverage",
    "advanced-sources", "advanced-recompute",
  ];
  assert.equal(stageNames.length, 13);
  for (const stage of stageNames) {
    assert.equal(progressValidate({
      ...progress,
      payload: { ...progress.payload, stage },
    }), true, stage);
  }
  assert.equal(progressValidate({
    ...progress,
    payload: { ...progress.payload, stage: "post-processing" },
  }), false, "Progress stage must be one of the thirteen pipeline stages");
  assert.equal(progressValidate({
    ...progress,
    payload: { ...progress.payload, stageIndex: 13, stageCount: 13 },
  }), true, "The last catalog index may equal stageCount");
  const indexBeyondCount = {
    ...progress,
    payload: { ...progress.payload, stageIndex: 14, stageCount: 13 },
  };
  assert.equal(progressValidate(indexBeyondCount), true, "JSON Schema cannot compare sibling numeric values");
  assert.equal(eventSchema.safeParse(indexBeyondCount).success, false);
  assert.match(
    readJson<{ allOf: { properties: { payload: { properties: { stageIndex: { description: string } } } } }[] }>(
      "events/job.progress.v1.schema.json",
    ).allOf[1].properties.payload.properties.stageIndex.description,
    /must not exceed stageCount/,
  );
  assert.equal(progressValidate({
    ...progress,
    payload: { ...progress.payload, stageIndex: 0 },
  }), false);
  assert.equal(progressValidate({
    ...progress,
    payload: { ...progress.payload, stageCount: 0 },
  }), false);
  assert.equal(progressValidate({
    ...progress,
    payload: { ...progress.payload, stageIndex: 1.5 },
  }), false);
  assert.equal(progressValidate({
    ...progress,
    payload: { ...progress.payload, stageCount: 1.5 },
  }), false);
  assert.equal(progressValidate({
    ...progress,
    payload: { ...progress.payload, recordsProcessed: Number.MAX_SAFE_INTEGER },
  }), true);
  for (const recordsProcessed of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(progressValidate({
      ...progress,
      payload: { ...progress.payload, recordsProcessed },
    }), false);
  }

  for (const warningCode of ["outbox_write_failed", "event_history_incomplete"]) {
    assert.equal(warningValidate({
      ...warning,
      payload: { ...warning.payload, warningCode },
    }), true, warningCode);
  }
  for (const stage of [...stageNames, "post-processing"]) {
    assert.equal(warningValidate({
      ...warning,
      payload: { ...warning.payload, stage },
    }), true, stage);
  }
  assert.equal(warningValidate({
    ...warning,
    payload: { ...warning.payload, stage: "unknown" },
  }), false);
  assert.equal(warningValidate({
    ...warning,
    payload: { ...warning.payload, warningCode: "x".repeat(101) },
  }), false);
  assert.equal(warningValidate({
    ...warning,
    payload: { ...warning.payload, message: "x".repeat(501) },
  }), false);

  for (const value of [0, Number.MAX_SAFE_INTEGER]) {
    assert.equal(completedValidate({
      ...completed,
      payload: { ...completed.payload, totalRecordsProcessed: value, durationMs: value },
    }), true);
  }
  for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(completedValidate({
      ...completed,
      payload: { ...completed.payload, totalRecordsProcessed: value },
    }), false);
    assert.equal(completedValidate({
      ...completed,
      payload: { ...completed.payload, durationMs: value },
    }), false);
  }
  assert.equal(completedValidate({
    ...completed,
    payload: { ...completed.payload, stagesCompleted: -1 },
  }), false);
  assert.equal(completedValidate({
    ...completed,
    payload: { ...completed.payload, stagesFailed: 0.5 },
  }), false);
  assert.match(
    readJson<{ allOf: { properties: { payload: { description: string } } }[] }>(
      "events/job.completed.v1.schema.json",
    ).allOf[1].properties.payload.description,
    /must not exceed this execution's stageCount/,
  );
  const completionFitsExecution = (
    stagesCompleted: number,
    stagesFailed: number,
    stageCount: number,
  ) => stagesCompleted + stagesFailed <= stageCount;
  assert.equal(
    completionFitsExecution(
      completed.payload.stagesCompleted as number,
      completed.payload.stagesFailed as number,
      progress.payload.stageCount as number,
    ),
    true,
  );
  assert.equal(completionFitsExecution(13, 1, 13), false);

  const failedValidate = ajv.getSchema(schemaId("events/job.failed.v1.schema.json"))!;
  assert.equal(failedValidate({
    ...failed,
    payload: { ...failed.payload, failedStage: "post-processing" },
  }), false, "post-processing is not a failedStage");
  for (const failureCode of ["incomplete", "interrupted", "required_source_failed"]) {
    assert.equal(failedValidate({
      ...failed,
      payload: { ...failed.payload, failureCode },
    }), true, failureCode);
  }
  assert.equal(failedValidate({
    ...failed,
    payload: { ...failed.payload, failureCode: "unknown" },
  }), false);
  assert.equal(failedValidate({
    ...failed,
    payload: { ...failed.payload, message: "x".repeat(501) },
  }), false);
  const failedWithoutCounts = structuredClone(failed);
  delete failedWithoutCounts.payload.recordsProcessed;
  delete failedWithoutCounts.payload.totalRecordsProcessed;
  assert.equal(failedValidate(failedWithoutCounts), true, "Both optional counts may be omitted");
  const failedWithoutStageCount = structuredClone(failed);
  delete failedWithoutStageCount.payload.failedStage;
  delete failedWithoutStageCount.payload.recordsProcessed;
  failedWithoutStageCount.payload.totalRecordsProcessed = 120;
  assert.equal(failedValidate(failedWithoutStageCount), true, "Execution total does not require failedStage");
  const recordsProcessedWithoutStage = structuredClone(failed);
  delete recordsProcessedWithoutStage.payload.failedStage;
  assert.equal(failedValidate(recordsProcessedWithoutStage), false, "recordsProcessed requires failedStage");
  assert.equal(
    failedValidate({
      ...failed,
      payload: { ...failed.payload, totalRecordsProcessed: 127 },
    }),
    true,
    "Both stage and execution counts are valid together",
  );
  const descriptions = readJson<{
    allOf: {
      properties: {
        payload: {
          properties: {
            recordsProcessed: { description: string };
            totalRecordsProcessed: { description: string };
          };
        };
      };
    }[];
  }>("events/job.failed.v1.schema.json").allOf[1].properties.payload.properties;
  assert.match(descriptions.recordsProcessed.description, /Stage-level.*not the execution-wide total/);
  assert.match(descriptions.recordsProcessed.description, /only when failedStage is supplied/);
  assert.match(descriptions.totalRecordsProcessed.description, /Aggregate execution-level/);
  assert.match(descriptions.totalRecordsProcessed.description, /not a count of unique records or entities/);
  for (const value of [0, Number.MAX_SAFE_INTEGER]) {
    assert.equal(failedValidate({
      ...failed,
      payload: { ...failed.payload, recordsProcessed: value, totalRecordsProcessed: value, durationMs: value },
    }), true);
  }
  for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    for (const field of ["recordsProcessed", "totalRecordsProcessed", "durationMs"]) {
      assert.equal(failedValidate({
        ...failed,
        payload: { ...failed.payload, [field]: value },
      }), false, `${field}=${value}`);
    }
  }
});

test("event feed, query and acknowledgement schemas enforce their wire shapes", () => {
  const feedValidate = ajv.getSchema(schemaId("schemas/event-feed.v1.schema.json"))!;
  const queryValidate = ajv.getSchema(schemaId("schemas/event-feed-query.v1.schema.json"))!;
  const acknowledgementValidate = ajv.getSchema(
    schemaId("schemas/event-feed-acknowledgement.v1.schema.json"),
  )!;
  const feed = readJson<Record<string, unknown>>("examples/event-feed.json");
  const emptyFeed = readJson<Record<string, unknown>>("examples/event-feed-empty.json");
  const acknowledgement = readJson<Record<string, unknown>>("examples/event-feed-acknowledgement.json");

  assert.equal(feedValidate(feed), true, ajv.errorsText(feedValidate.errors));
  assert.equal(feedValidate(emptyFeed), true, ajv.errorsText(feedValidate.errors));
  assert.equal(acknowledgementValidate(acknowledgement), true, ajv.errorsText(acknowledgementValidate.errors));
  assert.deepEqual(emptyFeed, { events: [], hasMore: false });
  const feedItem = (feed as { events: unknown[] }).events[0];
  assert.equal(feedValidate({
    events: Array.from({ length: 101 }, () => feedItem),
    hasMore: false,
  }), false, "Feed batches cannot exceed 100 events");
  assert.equal(feedValidate({ ...feed, extra: true }), false);
  assert.equal(queryValidate({ after: 0, extra: true }), false);
  assert.equal(acknowledgementValidate({
    ...acknowledgement,
    extra: true,
  }), false);
  const feedSizeRules = readJson<{
    description: string;
    properties: {
      events: {
        description: string;
        items: { properties: { event: { description: string } } };
      };
      hasMore: { description: string };
    };
  }>("schemas/event-feed.v1.schema.json");
  assert.match(feedSizeRules.description, /2 MiB.*UTF-8 bytes/);
  assert.match(feedSizeRules.properties.events.description, /100 events/);
  assert.match(feedSizeRules.properties.events.items.properties.event.description, /16 KiB.*UTF-8 bytes/);
  assert.match(feedSizeRules.properties.hasMore.description, /more events existed beyond this returned batch/);
  assert.match(feedSizeRules.properties.hasMore.description, /when the response was generated; false when no additional events existed at that moment/);
  assert.match(feedSizeRules.properties.hasMore.description, /Events arriving afterward are returned by the next poll/);
  const feedWithMore = { ...feed, hasMore: true };
  assert.equal(feedValidate(feedWithMore), true, "hasMore=true is a valid feed response");

  for (const after of [0, 1, Number.MAX_SAFE_INTEGER]) {
    assert.equal(queryValidate({ after }), true);
  }
  for (const after of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(queryValidate({ after }), false);
  }
  for (const limit of [1, 100]) {
    assert.equal(queryValidate({ after: 0, limit }), true);
  }
  for (const limit of [0, -1, 1.5, 101, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(queryValidate({ after: 0, limit }), false);
  }
  for (const position of [0, Number.MAX_SAFE_INTEGER]) {
    assert.equal(acknowledgementValidate({ highestContiguousFeedPosition: position }), true);
  }
  for (const position of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(acknowledgementValidate({ highestContiguousFeedPosition: position }), false);
  }

  const feedEvent = (feed as { events: { feedPosition: number; event: unknown }[] }).events[0];
  assert.ok(feedEvent.feedPosition <= 126, "Feed examples use ascending global positions");
});

test("numeric, format, enum, JSON and error boundaries", () => {
  const health = readJson<Record<string, unknown>>("examples/health-status.json");
  for (const uptime of [0, 0.5, null]) assert.ok(healthStatusSchema.safeParse({ ...health, uptime }).success);
  for (const uptime of [-1, "unknown"]) assert.equal(healthStatusSchema.safeParse({ ...health, uptime }).success, false);
  assert.equal(healthStatusSchema.safeParse({ ...health, checks: [{ name: "storage", status: "bad" }] }).success, false);
  assert.equal(healthStatusSchema.safeParse({ ...health, timestamp: "2026-02-30T00:00:00Z" }).success, false);

  const registration = readJson<Record<string, unknown>>("examples/service-registration.json");
  for (const version of ["0.1.0", "1.2.3-rc.1+build.2", "1.0.0-0"]) {
    assert.ok(serviceRegistrationSchema.safeParse({ ...registration, version }).success, version);
  }
  for (const version of ["1.0", "v1.0.0", "01.2.3", "1.0.0-01"]) {
    assert.equal(serviceRegistrationSchema.safeParse({ ...registration, version }).success, false, version);
  }
  for (const field of ["healthEndpoint", "apiEndpoint"]) {
    for (const endpoint of ["/health", "ftp://example.com", "http://", "http://?query", "http://user:password@example.com", "not a uri"]) {
      assert.equal(serviceRegistrationSchema.safeParse({ ...registration, [field]: endpoint }).success, false, endpoint);
    }
  }
  assert.ok(serviceRegistrationSchema.safeParse({ ...registration, deploymentType: "future-mechanism" }).success);

  const backup = readJson<Record<string, unknown>>("examples/backup.json");
  for (const sizeBytes of [0, Number.MAX_SAFE_INTEGER]) assert.ok(backupSchema.safeParse({ ...backup, sizeBytes }).success);
  for (const sizeBytes of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(backupSchema.safeParse({ ...backup, sizeBytes }).success, false);
  }
  assert.equal(backupSchema.safeParse({ ...backup, encrypted: "true" }).success, false);
  for (const encryptionAlgorithm of ["AES-256-GCM", "ChaCha20-Poly1305"]) {
    assert.equal(backupSchema.safeParse({ ...backup, encryptionAlgorithm }).success, true);
  }
  assert.equal(backupSchema.safeParse({ ...backup, encryptionAlgorithm: "AES-256-CBC" }).success, false);
  const encryptedWithoutAlgorithm = { ...backup };
  delete encryptedWithoutAlgorithm.encryptionAlgorithm;
  assert.equal(backupSchema.safeParse(encryptedWithoutAlgorithm).success, false);
  const failedWithoutStructuredFailure = { ...backup, status: "failed", verificationStatus: "not_requested" };
  assert.equal(backupSchema.safeParse(failedWithoutStructuredFailure).success, false);
  const failedButStillPending = {
    ...backup,
    status: "failed",
    failure: { code: "FAILED", message: "Failed", reference: "failure-001" },
  };
  assert.equal(backupSchema.safeParse(failedButStillPending).success, false);
  const verifiedWithoutChecksum = {
    ...backup,
    status: "completed",
    verificationStatus: "verified",
    completedAt: "2026-11-02T17:01:00Z",
    verifiedAt: "2026-11-02T17:02:00Z",
  };
  assert.equal(backupSchema.safeParse(verifiedWithoutChecksum).success, false);
  assert.equal(backupSchema.safeParse({ ...backup, checksum: "not-a-digest" }).success, false);
  assert.equal(backupSchema.safeParse({ ...backup, verificationStatus: "ok" }).success, false);

  const completedBackup = readJson<EventFixture>("examples/events/backup.completed.json");
  assert.equal(completedBackup.payload.verificationStatus, "pending");
  assert.equal(eventSchema.safeParse(completedBackup).success, true, "Completion does not imply verification");
  const withoutCompletedAt = structuredClone(completedBackup);
  delete withoutCompletedAt.payload.completedAt;
  assert.equal(eventSchema.safeParse(withoutCompletedAt).success, false);
  assert.equal(eventSchema.safeParse({
    ...completedBackup,
    payload: { ...completedBackup.payload, verificationStatus: "verified" },
  }).success, false, "Completion cannot claim verification");

  const verifiedBackup = readJson<EventFixture>("examples/events/backup.verified.json");
  assert.equal(eventSchema.safeParse(verifiedBackup).success, true);
  assert.equal(eventSchema.safeParse({
    ...verifiedBackup,
    payload: { ...verifiedBackup.payload, status: "failed" },
  }).success, false, "A verified event must describe a completed backup");
  const withoutVerifiedAt = structuredClone(verifiedBackup);
  delete withoutVerifiedAt.payload.verifiedAt;
  assert.equal(eventSchema.safeParse(withoutVerifiedAt).success, false);

  const verificationFailure = readJson<EventFixture>("examples/events/backup.verification.failed.json");
  assert.equal(eventSchema.safeParse(verificationFailure).success, true);
  const failureWithoutReference = structuredClone(verificationFailure);
  delete (failureWithoutReference.payload.failure as Record<string, unknown>).reference;
  assert.equal(eventSchema.safeParse(failureWithoutReference).success, false);
  assert.equal(eventSchema.safeParse({
    ...verificationFailure,
    payload: { ...verificationFailure.payload, status: "failed" },
  }).success, false, "Verification failure does not change backup completion state");

  const failedBackup = readJson<EventFixture>("examples/events/backup.failed.json");
  assert.equal("completedAt" in failedBackup.payload, false);
  assert.equal("sizeBytes" in failedBackup.payload, false);
  assert.equal("checksum" in failedBackup.payload, false);
  assert.equal(failedBackup.payload.status, "failed");
  assert.equal(failedBackup.payload.verificationStatus, "not_requested");
  assert.equal(eventSchema.safeParse(failedBackup).success, true, "Failed backup needs no completed artifact");
  const failedWithoutStartedAt = structuredClone(failedBackup);
  delete failedWithoutStartedAt.payload.startedAt;
  assert.equal(eventSchema.safeParse(failedWithoutStartedAt).success, false);
  const failedWithoutReference = structuredClone(failedBackup);
  delete (failedWithoutReference.payload.failure as Record<string, unknown>).reference;
  assert.equal(eventSchema.safeParse(failedWithoutReference).success, false);

  assert.equal(healthStatusSchema.safeParse({
    ...health,
    status: "healthy",
    timestamp: "2020-01-01T00:00:00Z",
    lastSuccessfulCheck: "2019-12-31T23:59:00Z",
  }).success, true, "A stale healthy report remains structurally valid; freshness is consumer policy");
  assert.equal(healthStatusSchema.safeParse({ ...health, lastSuccessfulCheck: null }).success, true);

  const task = readJson<Record<string, unknown>>("examples/agent-task.json");
  assert.equal(agentTaskSchema.safeParse({ ...task, priority: 1 }).success, false);
  assert.equal(agentTaskSchema.safeParse({ ...task, error: { code: "X" } }).success, false);
  const completed = readJson<EventFixture>("examples/events/agent.task.completed.json");
  for (const result of [null, true, 42, "summary", [null, 1, { nested: ["value"] }], { summary: "ok" }]) {
    assert.ok(eventSchema.safeParse({ ...completed, payload: { ...completed.payload, result } }).success);
  }
  const failed = readJson<EventFixture>("examples/events/agent.task.failed.json");
  assert.ok(eventSchema.safeParse(failed).success, "Failure before starting is valid");

  const failure = healthStatusSchema.safeParse({ ...health, uptime: -1 });
  assert.equal(failure.success, false);
  if (!failure.success) assert.match(failure.error.message, /uptime.*>= 0/);
});

test("OpenAPI 3.1 validates with all refs offline and uses canonical request/response schemas", async () => {
  const api = await SwaggerParser.validate(resolve(root, "openapi/service.v1.openapi.json"));
  assert.ok("openapi" in api);
  assert.equal(api.openapi, "3.1.0");
  const raw = readJson<{
    info: { version: string };
    paths: {
      "/health": { get: { responses: Record<string, { content: { "application/json": { schema: { $ref: string } } } }> } };
      "/events": { post: { requestBody: { content: { "application/json": { schema: { $ref: string } } } }; responses: Record<string, unknown> } };
      "/api/ops/v1/events": {
        get: {
          description: string;
          parameters: { name: string; in: string; required: boolean; schema: { $ref: string } }[];
          responses: Record<string, unknown>;
        };
      };
      "/api/ops/v1/events/ack": {
        post: {
          description: string;
          requestBody: { content: { "application/json": { schema: { $ref: string } } } };
          responses: Record<string, { description: string; content?: unknown }>;
        };
      };
    };
  }>("openapi/service.v1.openapi.json");
  assert.equal(raw.info.version, readJson<{ version: string }>("package.json").version);
  assert.equal(raw.paths["/health"].get.responses["200"].content["application/json"].schema.$ref,
    "../schemas/health-status.v1.schema.json");
  assert.equal(raw.paths["/events"].post.requestBody.content["application/json"].schema.$ref,
    "../events/event.v1.schema.json");
  assert.deepEqual(Object.keys(raw.paths["/events"].post.responses).sort(), ["202", "400", "415", "422", "503"]);
  assert.deepEqual(raw.paths["/api/ops/v1/events"].get.parameters.map(({ name }) => name), ["after", "limit"]);
  assert.equal(raw.paths["/api/ops/v1/events"].get.parameters[0].required, true);
  assert.equal(raw.paths["/api/ops/v1/events"].get.parameters[0].schema.$ref,
    "../schemas/event-feed-query.v1.schema.json#/properties/after");
  assert.deepEqual(Object.keys(raw.paths["/api/ops/v1/events"].get.responses).sort(), ["200", "400"]);
  assert.match(raw.paths["/api/ops/v1/events"].get.description, /future after cursor is invalid/);
  assert.match(raw.paths["/api/ops/v1/events"].get.description, /hasMore=true means more events existed/);
  assert.match(raw.paths["/api/ops/v1/events"].get.description, /picked up by the next poll/);
  assert.equal(
    raw.paths["/api/ops/v1/events/ack"].post.requestBody.content["application/json"].schema.$ref,
    "../schemas/event-feed-acknowledgement.v1.schema.json",
  );
  assert.match(raw.paths["/api/ops/v1/events/ack"].post.description, /monotonic/);
  assert.match(raw.paths["/api/ops/v1/events/ack"].post.description, /never deletes outbox records/);
  const acknowledgementResponse = raw.paths["/api/ops/v1/events/ack"].post.responses["204"];
  assert.deepEqual(Object.keys(raw.paths["/api/ops/v1/events/ack"].post.responses), ["204"]);
  assert.match(acknowledgementResponse.description, /accepted/);
  assert.match(acknowledgementResponse.description, /No response body/);
  assert.match(acknowledgementResponse.description, /not.*deleted/);
  assert.equal("content" in acknowledgementResponse, false);
});

test("README requires consumer-side cross-field validation independent of implementation language", () => {
  const readme = readFileSync(resolve(root, "README.md"), "utf8");
  assert.match(readme, /Consumers in every implementation language and with every validation library/);
  assert.match(readme, /For `job\.progress`, `stageIndex` must not exceed `stageCount`/);
  assert.match(readme, /For `job\.completed`, `stagesCompleted \+ stagesFailed` must not exceed/);
  assert.match(readme, /validate it against persisted execution history/);
  assert.match(readme, /Zod is not their sole\s+authority/);
});
