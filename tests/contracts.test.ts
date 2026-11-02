import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
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
  "backup.started": [],
  "backup.completed": ["completedAt", "sizeBytes", "checksum"],
  "backup.failed": ["completedAt"],
  "agent.task.started": ["startedAt"],
  "agent.task.completed": ["startedAt", "completedAt", "result"],
  "agent.task.failed": ["completedAt", "error"],
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
  assert.equal(schemaFiles.filter((file) => file.startsWith("schemas/")).length, 6);
  assert.equal(schemaFiles.filter((file) => file.startsWith("events/")).length, 15);
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

for (const [name, required] of Object.entries(eventRequirements)) {
  test(`${name}: payload, discriminator, lifecycle and envelope validation`, () => {
    const example = readJson<EventFixture>(`examples/events/${name}.json`);
    const validate = ajv.getSchema(schemaId(`events/${name}.v1.schema.json`))!;
    assert.equal(example.eventType, name);
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
    const extended = {
      ...example,
      traceContext: { traceId: "trace-001" },
      payload: { ...example.payload, futureOptionalField: true },
    };
    assert.deepEqual(eventSchema.parse(extended), extended);
  });
}

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
  assert.equal(backupSchema.safeParse({ ...backup, checksum: "not-a-digest" }).success, false);
  assert.equal(backupSchema.safeParse({ ...backup, verificationStatus: "ok" }).success, false);

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
    };
  }>("openapi/service.v1.openapi.json");
  assert.equal(raw.info.version, readJson<{ version: string }>("package.json").version);
  assert.equal(raw.paths["/health"].get.responses["200"].content["application/json"].schema.$ref,
    "../schemas/health-status.v1.schema.json");
  assert.equal(raw.paths["/events"].post.requestBody.content["application/json"].schema.$ref,
    "../events/event.v1.schema.json");
  assert.deepEqual(Object.keys(raw.paths["/events"].post.responses).sort(), ["202", "400", "415", "422", "503"]);
});
