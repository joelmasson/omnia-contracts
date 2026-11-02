import { eventSchema, serviceRegistrationSchema } from "../typescript/validators.js";
import { readJson } from "../typescript/catalog.js";
import type { OmniaEvent, ServiceRegistration } from "../typescript/contracts.js";

const registration: ServiceRegistration = serviceRegistrationSchema.parse(
  readJson<unknown>("examples/service-registration.json"),
);
const event: OmniaEvent = eventSchema.parse(
  readJson<unknown>("examples/events/backup.completed.json"),
);
console.log(`Registered ${registration.serviceId}; validated ${event.eventType}`);
