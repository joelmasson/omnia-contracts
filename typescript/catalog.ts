import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AnySchemaObject } from "ajv";

export const root = fileURLToPath(new URL("../", import.meta.url));

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8")) as T;
}

export const schemaFiles = ["schemas", "events"].flatMap((directory) =>
  readdirSync(new URL(`../${directory}/`, import.meta.url))
    .filter((name) => name.endsWith(".schema.json"))
    .sort()
    .map((name) => `${directory}/${name}`),
);

export const schemas = schemaFiles.map((path) => readJson<AnySchemaObject>(path));
export const schemaId = (path: string) => `https://schemas.omnia.dev/${path}`;
