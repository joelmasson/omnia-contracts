import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { z } from "zod";
import { schemas, schemaId } from "./catalog.js";
import type { ContractMap } from "./contracts.js";

// Node.js consumer example: Ajv remains the canonical validator; Zod is an adapter.
export const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats.default(ajv);
for (const schema of schemas) ajv.addSchema(schema);

function validator<T>(path: string) {
  const validate = ajv.getSchema<T>(schemaId(path));
  if (!validate) throw new Error(`Missing canonical schema: ${path}`);
  return z.custom<T>((value) => validate(value), {
    error: () => ajv.errorsText(validate.errors, { separator: "; " }),
  });
}

export const serviceRegistrationSchema = validator<ContractMap["serviceRegistration"]>(
  "schemas/service-registration.v1.schema.json",
);
export const healthStatusSchema = validator<ContractMap["healthStatus"]>("schemas/health-status.v1.schema.json");
export const incidentSchema = validator<ContractMap["incident"]>("schemas/incident.v1.schema.json");
export const deploymentSchema = validator<ContractMap["deployment"]>("schemas/deployment.v1.schema.json");
export const backupSchema = validator<ContractMap["backup"]>("schemas/backup.v1.schema.json");
export const agentTaskSchema = validator<ContractMap["agentTask"]>("schemas/agent-task.v1.schema.json");
export const eventSchema = validator<ContractMap["event"]>("events/event.v1.schema.json").refine(
  (event) => event.eventType !== "job.progress" || event.payload.stageIndex <= event.payload.stageCount,
  { error: "job.progress payload.stageIndex must not exceed stageCount" },
);
