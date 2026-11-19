import type { z } from "zod";
import type {
  AgentTaskCompletedEvent,
  BackupFailedEvent,
  BackupCompletedEvent,
  BackupVerifiedEvent,
  BackupVerificationFailedEvent,
  DeploymentExecution,
  DeploymentRequest,
  EventFeed,
  EventFeedAcknowledgement,
  EventFeedQuery,
  JobCompletedEvent,
  JobProgressEvent,
  JobStartedEvent,
  OmniaEvent,
  ServiceHealthChangedEvent,
  ServiceRegistration,
  ServiceUnavailableEvent,
} from "../typescript/contracts.js";
import type {
  deploymentExecutionSchema,
  deploymentRequestSchema,
  eventSchema,
  serviceRegistrationSchema,
} from "../typescript/validators.js";

type Assert<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type EventOutputMatches = Assert<Equal<z.output<typeof eventSchema>, OmniaEvent>>;
type RegistrationOutputMatches = Assert<Equal<z.output<typeof serviceRegistrationSchema>, ServiceRegistration>>;
type DeploymentRequestOutputMatches = Assert<
  Equal<z.output<typeof deploymentRequestSchema>, DeploymentRequest>
>;
type DeploymentExecutionOutputMatches = Assert<
  Equal<z.output<typeof deploymentExecutionSchema>, DeploymentExecution>
>;

export function narrowEvent(event: OmniaEvent): string | undefined {
  if (event.eventType === "backup.completed") {
    const checksum: string = event.payload.checksum;
    const sizeBytes: number = event.payload.sizeBytes;
    const completedAt: string = event.payload.completedAt;
    const status: "completed" = event.payload.status;
    return `${checksum}:${sizeBytes}:${completedAt}:${status}`;
  }
  if (event.eventType === "agent.task.failed") {
    const message: string = event.payload.error.message;
    return message;
  }
  return undefined;
}

// Required lifecycle fields must remain required in generated TypeScript, not just at runtime.
type CompletedPayload = BackupCompletedEvent["payload"];
type CompletionIsRequired = Assert<Equal<CompletedPayload["completedAt"], string>>;
type ChecksumIsRequired = Assert<Equal<CompletedPayload["checksum"], string>>;
type HealthChangedVersion = Assert<Equal<ServiceHealthChangedEvent["eventVersion"], "1.1.0">>;
type ServiceUnavailableVersion = Assert<Equal<ServiceUnavailableEvent["eventVersion"], "1.0.0">>;
type BackupVerifiedVersion = Assert<Equal<BackupVerifiedEvent["eventVersion"], "1.0.0">>;
type BackupFailureReferenceIsRequired = Assert<
  Equal<BackupFailedEvent["payload"]["failure"]["reference"], string>
>;
type VerificationFailureReferenceIsRequired = Assert<
  Equal<BackupVerificationFailedEvent["payload"]["failure"]["reference"], string>
>;
type JobEventVersion = Assert<Equal<JobStartedEvent["eventVersion"], "1.0.0">>;
type JobCompletedStatus = Assert<Equal<JobCompletedEvent["payload"]["status"], "complete">>;
type FeedPositionType = Assert<Equal<EventFeed["events"][number]["feedPosition"], number>>;
type DeploymentContractVersion = Assert<Equal<DeploymentRequest["contractVersion"], "1.0.0">>;
type DeploymentExecutionStatus = Assert<
  Equal<DeploymentExecution["status"], "queued" | "running" | "succeeded" | "failed" | "cancelled">
>;
type DeploymentAdapter = Assert<
  Equal<DeploymentRequest["adapter"], "docker-compose" | "node-systemd" | "application-specific">
>;

export const taskResultShapes: AgentTaskCompletedEvent["payload"]["result"][] = [
  null, true, 42, "summary", [null, 1, { nested: ["value"] }], { summary: "ok" },
];
export const jobProgressStages: JobProgressEvent["payload"]["stage"][] = ["nhle", "advanced-recompute"];
export const eventFeedQueries: EventFeedQuery[] = [{ after: 0 }, { after: 126, limit: 100 }];
export const eventFeedAcknowledgements: EventFeedAcknowledgement[] = [
  { highestContiguousFeedPosition: 126 },
];
export const deploymentAdapters: DeploymentRequest["adapter"][] = [
  "docker-compose",
  "node-systemd",
  "application-specific",
];
export const deploymentStatuses: DeploymentExecution["status"][] = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
];
