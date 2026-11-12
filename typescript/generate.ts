import { readFile, writeFile } from "node:fs/promises";
import { compile } from "json-schema-to-typescript";
import { root } from "./catalog.js";

const resourceNames = [
  "service-registration",
  "health-status",
  "incident",
  "deployment",
  "backup",
  "agent-task",
  "event-feed-query",
  "event-feed",
  "event-feed-acknowledgement",
] as const;
const properties = Object.fromEntries(
  resourceNames.map((name) => [
    name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    { $ref: `schemas/${name}.v1.schema.json` },
  ]),
);

const output = await compile(
  {
    title: "ContractMap",
    type: "object",
    properties: {
      ...properties,
      event: { $ref: "events/event.v1.schema.json" },
    },
    required: [...Object.keys(properties), "event"],
    additionalProperties: false,
  },
  "ContractMap",
  {
    cwd: root,
    unknownAny: true,
    bannerComment: "/* Generated from canonical JSON Schema by npm run generate. Do not edit. */",
  },
);
const target = new URL("./contracts.ts", import.meta.url);
if (process.argv.includes("--check")) {
  if ((await readFile(target, "utf8")) !== output) {
    throw new Error("Generated types are stale. Run npm run generate and commit the result.");
  }
} else {
  await writeFile(target, output);
}
