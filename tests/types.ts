import type { z } from "zod";
import type { AgentTaskCompletedEvent, BackupCompletedEvent, OmniaEvent, ServiceRegistration } from "../typescript/contracts.js";
import type { eventSchema, serviceRegistrationSchema } from "../typescript/validators.js";

type Assert<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type EventOutputMatches = Assert<Equal<z.output<typeof eventSchema>, OmniaEvent>>;
type RegistrationOutputMatches = Assert<Equal<z.output<typeof serviceRegistrationSchema>, ServiceRegistration>>;

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

export const taskResultShapes: AgentTaskCompletedEvent["payload"]["result"][] = [
  null, true, 42, "summary", [null, 1, { nested: ["value"] }], { summary: "ok" },
];
