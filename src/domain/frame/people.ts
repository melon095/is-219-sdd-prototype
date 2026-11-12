import type { WorkerProfile } from "../marketplace/types";
import type { Business, DemoState, Id, Person } from "./types";

export function isOwnerOf(personId: Id, business: Business): boolean {
  return business.ownerId === personId;
}

export function ownedBusiness(
  personId: Id,
  state: DemoState,
): Business | undefined {
  return state.frame.businesses.find((business) =>
    isOwnerOf(personId, business),
  );
}

export function isAdmin(person: Person): boolean {
  return person.isVaroddAdmin;
}

export function personById(personId: Id, state: DemoState): Person | undefined {
  return state.frame.people.find((person) => person.id === personId);
}

export function workerProfileOf(
  personId: Id,
  state: DemoState,
): WorkerProfile | undefined {
  return state.marketplace.workerProfiles.find(
    (profile) => profile.personId === personId,
  );
}

export type SwitcherSection =
  | "Bedriftseiere"
  | "Ansatte"
  | "Arbeidssøkere"
  | "Varodd";

export const switcherSections: SwitcherSection[] = [
  "Bedriftseiere",
  "Ansatte",
  "Arbeidssøkere",
  "Varodd",
];

export function switcherSection(
  person: Person,
  state: DemoState,
): SwitcherSection | undefined {
  if (ownedBusiness(person.id, state) !== undefined) {
    return "Bedriftseiere";
  }
  if (
    state.frame.businesses.some((business) =>
      business.employeeIds.includes(person.id),
    )
  ) {
    return "Ansatte";
  }
  if (person.seeksWork) {
    return "Arbeidssøkere";
  }
  if (isAdmin(person)) {
    return "Varodd";
  }
  return undefined;
}

export function peopleWorkingAt(
  business: Business,
  state: DemoState,
): Person[] {
  const placedWorkerIds = state.marketplace.requests
    .filter(
      (request) =>
        request.businessId === business.id &&
        request.agreement !== undefined &&
        (request.status === "in-progress" ||
          (request.status === "completed" && request.outcome === "permanent")),
    )
    .map((request) => request.agreement?.workerId)
    .filter((id): id is Id => id !== undefined);
  const ids = new Set<Id>([
    business.ownerId,
    ...business.employeeIds,
    ...placedWorkerIds,
  ]);
  return [...ids]
    .map((id) => personById(id, state))
    .filter((person): person is Person => person !== undefined);
}
