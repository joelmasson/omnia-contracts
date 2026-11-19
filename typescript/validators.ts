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
export const deploymentRequestSchema = validator<ContractMap["deploymentRequest"]>(
  "schemas/deployment-request.v1.schema.json",
);
export const deploymentExecutionSchema = validator<ContractMap["deploymentExecution"]>(
  "schemas/deployment-execution.v1.schema.json",
);
export const backupSchema = validator<ContractMap["backup"]>("schemas/backup.v1.schema.json");
export const agentTaskSchema = validator<ContractMap["agentTask"]>("schemas/agent-task.v1.schema.json");
export function isValidDeploymentStatusTransition(
  from: ContractMap["deploymentExecution"]["status"],
  to: ContractMap["deploymentExecution"]["status"],
): boolean {
  return (
    (from === "queued" && (to === "running" || to === "cancelled")) ||
    (from === "running" && (to === "succeeded" || to === "failed" || to === "cancelled"))
  );
}

export function isDeploymentExecutionConsistentWithRequest(
  request: ContractMap["deploymentRequest"],
  execution: ContractMap["deploymentExecution"],
): boolean {
  if (
    request.deploymentId !== execution.deploymentId ||
    request.authorization.requestId !== execution.requestId ||
    request.adapter !== execution.adapter ||
    request.requestedOperation !== execution.requestedOperation ||
    request.rollback.supported !== execution.rollback.supported
  ) {
    return false;
  }

  if (execution.workflowRun && execution.workflowRun.repository !== request.service.repository) {
    return false;
  }

  if (request.rollback.supported) {
    const requestedPreviousArtifact = request.rollback.previousArtifact;
    const executionPreviousArtifact = execution.rollback.previousArtifact;
    if (
      !requestedPreviousArtifact ||
      !executionPreviousArtifact ||
      requestedPreviousArtifact.reference !== executionPreviousArtifact.reference ||
      requestedPreviousArtifact.digest !== executionPreviousArtifact.digest
    ) {
      return false;
    }
  }

  if (execution.status === "succeeded") {
    const expectedDigest =
      request.requestedOperation === "rollback"
        ? request.rollback.previousArtifact?.digest
        : request.artifact.digest;
    return execution.deployedArtifactDigest === expectedDigest;
  }

  return true;
}

export const eventSchema = validator<ContractMap["event"]>("events/event.v1.schema.json").refine(
  (event) => event.eventType !== "job.progress" || event.payload.stageIndex <= event.payload.stageCount,
  { error: "job.progress payload.stageIndex must not exceed stageCount" },
);
