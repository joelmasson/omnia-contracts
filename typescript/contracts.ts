/* Generated from canonical JSON Schema by npm run generate. Do not edit. */

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
  | AgentTaskStartedEvent
  | AgentTaskCompletedEvent
  | AgentTaskFailedEvent;
export type ServiceHealthChangedEvent = EventEnvelope & {
  eventType: "service.health.changed";
  payload: HealthStatus;
  [k: string]: unknown;
};
export type ServiceUnavailableEvent = EventEnvelope & {
  eventType: "service.unavailable";
  payload: HealthStatus & {
    status: "unhealthy" | "unknown";
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type IncidentCreatedEvent = EventEnvelope & {
  eventType: "incident.created";
  payload: Incident & {
    status: "open";
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type IncidentResolvedEvent = EventEnvelope & {
  eventType: "incident.resolved";
  payload: Incident & {
    status: "resolved";
    resolvedAt: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type DeploymentStartedEvent = EventEnvelope & {
  eventType: "deployment.started";
  payload: Deployment & {
    status: "started";
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type DeploymentCompletedEvent = EventEnvelope & {
  eventType: "deployment.completed";
  payload: Deployment & {
    status: "completed";
    completedAt: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type DeploymentFailedEvent = EventEnvelope & {
  eventType: "deployment.failed";
  payload: Deployment & {
    status: "failed";
    completedAt: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type BackupStartedEvent = EventEnvelope & {
  eventType: "backup.started";
  payload: Backup & {
    status: "started";
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type BackupCompletedEvent = EventEnvelope & {
  eventType: "backup.completed";
  payload: Backup & {
    status: "completed";
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
  payload: Backup & {
    status: "failed";
    completedAt: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type AgentTaskStartedEvent = EventEnvelope & {
  eventType: "agent.task.started";
  payload: AgentTask & {
    status: "started";
    startedAt: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};
export type AgentTaskCompletedEvent = EventEnvelope & {
  eventType: "agent.task.completed";
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
export interface Backup {
  backupId: string;
  /**
   * Logical source reference, never credentials.
   */
  source: string;
  /**
   * Logical destination reference, never credentials.
   */
  destination: string;
  startedAt: string;
  completedAt?: string;
  sizeBytes?: number;
  encrypted: boolean;
  /**
   * Algorithm-prefixed hexadecimal digest, e.g. sha256:abcd...; algorithm policy belongs to ARCHIVIST.
   */
  checksum?: string;
  verificationStatus: "pending" | "verified" | "failed" | "not_requested";
  status: "started" | "completed" | "failed";
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
  eventVersion: "1.0.0";
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
