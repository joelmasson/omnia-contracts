/* Generated from canonical JSON Schema by npm run generate. Do not edit. */

/**
 * Never include credentials, encryption keys or other secrets in this object or its extension fields.
 */
export type Backup = {
  [k: string]: unknown;
} & {
  backupId: string;
  /**
   * Logical source reference; must not contain credentials.
   */
  source: string;
  /**
   * Logical destination reference; must not contain credentials.
   */
  destination: string;
  /**
   * The strategy used to create this backup.
   */
  backupType?: "full" | "incremental" | "differential" | "snapshot";
  startedAt: string;
  completedAt?: string;
  sizeBytes?: number;
  encrypted: boolean;
  /**
   * Algorithm name only; never include keys, credentials or other encryption secrets.
   */
  encryptionAlgorithm?: "AES-256-GCM" | "ChaCha20-Poly1305";
  /**
   * Algorithm-prefixed hexadecimal digest, e.g. sha256:abcd...; algorithm policy belongs to ARCHIVIST.
   */
  checksum?: string;
  verifiedAt?: string;
  verificationStatus: "pending" | "verified" | "failed" | "not_requested";
  status: "started" | "completed" | "failed";
  failure?: Failure;
  [k: string]: unknown;
};
/**
 * Serialized event object maximum is 16 KiB measured in UTF-8 bytes.
 */
export type OmniaEvent =
  | ServiceHealthChangedEvent
  | ServiceUnavailableEvent
  | IncidentCreatedEvent
  | IncidentResolvedEvent
  | DeploymentStartedEvent
  | DeploymentCompletedEvent
  | DeploymentFailedEvent
  | BackupStartedEvent
  | BackupCompletedEvent
  | BackupFailedEvent
  | BackupVerifiedEvent
  | BackupVerificationFailedEvent
  | AgentTaskStartedEvent
  | AgentTaskCompletedEvent
  | AgentTaskFailedEvent
  | JobStartedEvent
  | JobProgressEvent
  | JobWarningEvent
  | JobCompletedEvent
  | JobFailedEvent;
export type ServiceHealthChangedEvent = EventEnvelope & {
  eventType: "service.health.changed";
  eventVersion: "1.1.0";
  payload: HealthStatus;
  [k: string]: unknown;
};
export type ServiceUnavailableEvent = EventEnvelope & {
  eventType: "service.unavailable";
  eventVersion: "1.0.0";
  payload: HealthStatus & {
    status: "unhealthy" | "unknown";
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type IncidentCreatedEvent = EventEnvelope & {
  eventType: "incident.created";
  eventVersion: "1.0.0";
  payload: Incident & {
    status: "open";
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type IncidentResolvedEvent = EventEnvelope & {
  eventType: "incident.resolved";
  eventVersion: "1.0.0";
  payload: Incident & {
    status: "resolved";
    resolvedAt: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type DeploymentStartedEvent = EventEnvelope & {
  eventType: "deployment.started";
  eventVersion: "1.0.0";
  payload: Deployment & {
    status: "started";
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type DeploymentCompletedEvent = EventEnvelope & {
  eventType: "deployment.completed";
  eventVersion: "1.0.0";
  payload: Deployment & {
    status: "completed";
    completedAt: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type DeploymentFailedEvent = EventEnvelope & {
  eventType: "deployment.failed";
  eventVersion: "1.0.0";
  payload: Deployment & {
    status: "failed";
    completedAt: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type BackupStartedEvent = EventEnvelope & {
  eventType: "backup.started";
  eventVersion: "1.0.0";
  payload: Backup & {
    status: "started";
    verificationStatus: "pending";
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type BackupCompletedEvent = EventEnvelope & {
  eventType: "backup.completed";
  eventVersion: "1.1.0";
  payload: Backup & {
    status: "completed";
    verificationStatus: "pending" | "not_requested";
    completedAt: string;
    sizeBytes: number;
    /**
     * Algorithm-prefixed hexadecimal digest, e.g. sha256:abcd...; algorithm policy belongs to ARCHIVIST.
     */
    checksum: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type BackupFailedEvent = EventEnvelope & {
  eventType: "backup.failed";
  eventVersion: "1.0.0";
  payload: Backup & {
    status: "failed";
    verificationStatus: "not_requested";
    failure: Failure;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type BackupVerifiedEvent = EventEnvelope & {
  eventType: "backup.verified";
  eventVersion: "1.0.0";
  payload: Backup & {
    status: "completed";
    verificationStatus: "verified";
    completedAt: string;
    verifiedAt: string;
    /**
     * Algorithm-prefixed hexadecimal digest, e.g. sha256:abcd...; algorithm policy belongs to ARCHIVIST.
     */
    checksum: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type BackupVerificationFailedEvent = EventEnvelope & {
  eventType: "backup.verification.failed";
  eventVersion: "1.0.0";
  payload: Backup & {
    status: "completed";
    verificationStatus: "failed";
    completedAt: string;
    failure: Failure;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type AgentTaskStartedEvent = EventEnvelope & {
  eventType: "agent.task.started";
  eventVersion: "1.0.0";
  payload: AgentTask & {
    status: "started";
    startedAt: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type AgentTaskCompletedEvent = EventEnvelope & {
  eventType: "agent.task.completed";
  eventVersion: "1.0.0";
  payload: AgentTask & {
    status: "completed";
    startedAt: string;
    completedAt: string;
    /**
     * Any JSON value; absent until a result is available.
     */
    result:
      | null
      | boolean
      | number
      | string
      | unknown[]
      | {
          [k: string]: unknown;
        };
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type AgentTaskFailedEvent = EventEnvelope & {
  eventType: "agent.task.failed";
  eventVersion: "1.0.0";
  payload: AgentTask & {
    status: "failed";
    completedAt: string;
    error: AgentTaskError;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type JobStartedEvent = EventEnvelope & {
  eventType: "job.started";
  eventVersion: "1.0.0";
  payload: {
    jobKey: string;
    executionId: string;
    /**
     * Positive safe integer; sequence 1 is job.started.
     */
    sequence: number;
    trigger: "cron" | "startup" | "manual_api" | "api_fallback" | "dfhl_notifications";
  };
  [k: string]: unknown;
};
export type JobProgressEvent = EventEnvelope & {
  eventType: "job.progress";
  eventVersion: "1.0.0";
  payload: {
    jobKey: string;
    executionId: string;
    sequence: number;
    stage:
      | "nhle"
      | "moneypuck"
      | "nst"
      | "skater-stats"
      | "goalie-stats"
      | "goalie-starts"
      | "goalie-storage"
      | "player-storage"
      | "standings"
      | "schedule"
      | "goalie-coverage"
      | "advanced-sources"
      | "advanced-recompute";
    /**
     * Stable stage catalog position, must not exceed stageCount, and does not determine execution order; the first six stages may run concurrently.
     */
    stageIndex: number;
    stageCount: number;
    status: "started" | "completed";
    /**
     * Non-negative safe integer representing the stage total.
     */
    recordsProcessed?: number;
  };
  [k: string]: unknown;
};
export type JobWarningEvent = EventEnvelope & {
  eventType: "job.warning";
  eventVersion: "1.0.0";
  payload: {
    jobKey: string;
    executionId: string;
    sequence: number;
    stage:
      | "nhle"
      | "moneypuck"
      | "nst"
      | "skater-stats"
      | "goalie-stats"
      | "goalie-starts"
      | "goalie-storage"
      | "player-storage"
      | "standings"
      | "schedule"
      | "goalie-coverage"
      | "advanced-sources"
      | "advanced-recompute"
      | "post-processing";
    /**
     * Stable producer-owned code, not a shared enum. Includes outbox_write_failed and event_history_incomplete.
     */
    warningCode: string;
    message?: string;
  };
  [k: string]: unknown;
};
export type JobCompletedEvent = EventEnvelope & {
  eventType: "job.completed";
  eventVersion: "1.0.0";
  /**
   * The sum of stagesCompleted and stagesFailed must not exceed this execution's stageCount.
   */
  payload: {
    jobKey: string;
    executionId: string;
    sequence: number;
    status: "complete";
    stagesCompleted: number;
    stagesFailed: number;
    totalRecordsProcessed?: number;
    durationMs?: number;
  };
  [k: string]: unknown;
};
export type JobFailedEvent = EventEnvelope & {
  eventType: "job.failed";
  eventVersion: "1.0.0";
  payload: {
    jobKey: string;
    executionId: string;
    sequence: number;
    status: "failed";
    failureCode: "incomplete" | "interrupted" | "required_source_failed";
    message?: string;
    failedStage?:
      | "nhle"
      | "moneypuck"
      | "nst"
      | "skater-stats"
      | "goalie-stats"
      | "goalie-starts"
      | "goalie-storage"
      | "player-storage"
      | "standings"
      | "schedule"
      | "goalie-coverage"
      | "advanced-sources"
      | "advanced-recompute"
      | "post-processing";
    /**
     * Stage-level count accumulated for failedStage when the execution failed; not the execution-wide total. Supply only when failedStage is supplied, and omit if the stage or count cannot be reliably identified.
     */
    recordsProcessed?: number;
    /**
     * Aggregate execution-level count processed up to failure; not a count of unique records or entities unless the producer explicitly guarantees that property. Omit if the aggregate cannot be reliably calculated.
     */
    totalRecordsProcessed?: number;
    durationMs?: number;
  };
  [k: string]: unknown;
};
export type OmniaEvent1 =
  | ServiceHealthChangedEvent
  | ServiceUnavailableEvent
  | IncidentCreatedEvent
  | IncidentResolvedEvent
  | DeploymentStartedEvent
  | DeploymentCompletedEvent
  | DeploymentFailedEvent
  | BackupStartedEvent
  | BackupCompletedEvent
  | BackupFailedEvent
  | BackupVerifiedEvent
  | BackupVerificationFailedEvent
  | AgentTaskStartedEvent
  | AgentTaskCompletedEvent
  | AgentTaskFailedEvent
  | JobStartedEvent
  | JobProgressEvent
  | JobWarningEvent
  | JobCompletedEvent
  | JobFailedEvent;

export interface ContractMap {
  serviceRegistration: ServiceRegistration;
  healthStatus: HealthStatus;
  incident: Incident;
  deployment: Deployment;
  backup: Backup;
  agentTask: AgentTask;
  eventFeedQuery: EventFeedQuery;
  eventFeed: EventFeed;
  eventFeedAcknowledgement: EventFeedAcknowledgement;
  event: OmniaEvent1;
}
export interface ServiceRegistration {
  serviceId: string;
  name: string;
  /**
   * Service release version following Semantic Versioning 2.0.0.
   */
  version: string;
  description: string;
  healthEndpoint: string;
  apiEndpoint: string;
  /**
   * Opaque deployment mechanism label, not a platform-specific enum.
   */
  deploymentType: string;
  status: "starting" | "running" | "stopping" | "stopped" | "unknown";
  registeredAt: string;
  metadata: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
export interface HealthStatus {
  serviceId: string;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  timestamp: string;
  /**
   * Time of the last successful health check, or null if none has succeeded.
   */
  lastSuccessfulCheck?: string | null;
  /**
   * Elapsed seconds since service startup, or null when never observed.
   */
  uptime: number | null;
  checks: HealthCheck[];
  details: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
export interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  details?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
export interface Incident {
  incidentId: string;
  source: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  status: "open" | "acknowledged" | "resolved";
  metadata: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
export interface Deployment {
  deploymentId: string;
  applicationId: string;
  /**
   * Opaque application artifact version; not necessarily SemVer.
   */
  version: string;
  environment: string;
  initiatedBy: string;
  startedAt: string;
  completedAt?: string;
  status: "started" | "completed" | "failed";
  previousVersion?: string;
  rollbackAvailable: boolean;
  [k: string]: unknown;
}
export interface Failure {
  code: string;
  /**
   * Safe diagnostic text; must not contain credentials or encryption secrets.
   */
  message: string;
  /**
   * Opaque, non-secret identifier for the failure record.
   */
  reference: string;
  retryable?: boolean;
  /**
   * Producers must sanitize details and exclude credentials, tokens, encryption keys and all other secrets.
   */
  details?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
export interface AgentTask {
  taskId: string;
  agentId: string;
  status: "queued" | "started" | "completed" | "failed" | "cancelled";
  priority: "low" | "normal" | "high" | "critical";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  /**
   * Any JSON value; absent until a result is available.
   */
  result?:
    | null
    | boolean
    | number
    | string
    | unknown[]
    | {
        [k: string]: unknown;
      };
  error?: AgentTaskError;
  [k: string]: unknown;
}
export interface AgentTaskError {
  code: string;
  message: string;
  details?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
export interface EventFeedQuery {
  /**
   * Last acknowledged global feed position; use 0 for the first request.
   */
  after: number;
  /**
   * Maximum events to return; defaults to 100 and cannot exceed 100.
   */
  limit?: number;
}
/**
 * The serialized response is limited to 2 MiB measured in UTF-8 bytes. An empty feed returns events: [] and hasMore: false.
 */
export interface EventFeed {
  /**
   * Events are in ascending feedPosition order. A batch contains at most 100 events. Never truncate or silently omit an oversized event.
   *
   * @maxItems 100
   */
  events: {
    feedPosition: number;
    event: OmniaEvent;
  }[];
  hasMore: boolean;
}
export interface EventEnvelope {
  eventId: string;
  eventType: string;
  /**
   * Semantic version of this event type's wire contract.
   */
  eventVersion: string;
  timestamp: string;
  /**
   * Producer service ID; not a destination or routing dependency.
   */
  source: string;
  correlationId: string;
  payload: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * MAGOS acknowledges only positions it has safely accepted contiguously. Acknowledgement never deletes outbox records.
 */
export interface EventFeedAcknowledgement {
  /**
   * Authenticated forward-only cursor; equal repeats are harmless, lower values do not move it backwards, and it cannot exceed the highest persisted feed position.
   */
  highestContiguousFeedPosition: number;
}
