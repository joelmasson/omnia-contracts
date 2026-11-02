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
  | AgentTaskFailedEvent;
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

export interface ContractMap {
  serviceRegistration: ServiceRegistration;
  healthStatus: HealthStatus;
  incident: Incident;
  deployment: Deployment;
  backup: Backup;
  agentTask: AgentTask;
  event: OmniaEvent;
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
