import { isAdmin, personById, workerProfileOf } from "../frame/people";
import type { CommandError, DemoState, Id, Person } from "../frame/types";
import { liveEntry, ownerIdOf } from "./helpers";
import type { TaskRequest } from "./types";
import { canSeeRequest } from "./visibility";

export type Blocker = CommandError | undefined;

function blocked(code: CommandError["code"], message: string): CommandError {
  return { code, message };
}

export function publishBlocker(
  person: Person,
  businessId: Id,
  state: DemoState,
): Blocker {
  const business = state.frame.businesses.find(
    (item) => item.id === businessId,
  );
  if (business === undefined) {
    return blocked("not-found", "Vi finner ikke bedriften.");
  }
  if (business.ownerId !== person.id) {
    return blocked(
      "not-allowed",
      "Bare eieren av bedriften kan publisere oppdrag.",
    );
  }
  return undefined;
}

export function editBlocker(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): Blocker {
  if (ownerIdOf(state, request) !== person.id) {
    return blocked(
      "not-allowed",
      "Bare eieren av bedriften kan endre oppdraget.",
    );
  }
  if (request.status !== "open") {
    return blocked(
      "invalid-status",
      "Oppdraget kan bare endres mens det er åpent.",
    );
  }
  return undefined;
}

export function inviteBlocker(
  person: Person,
  request: TaskRequest,
  state: DemoState,
  workerId: Id,
): Blocker {
  if (ownerIdOf(state, request) !== person.id) {
    return blocked(
      "not-allowed",
      "Bare eieren av bedriften kan invitere til intervju.",
    );
  }
  if (request.status !== "shortlisted" && request.status !== "offered") {
    return blocked(
      "invalid-status",
      "Du kan bare invitere til intervju når kortlisten er klar.",
    );
  }
  const entry = liveEntry(request, workerId);
  if (entry === undefined || entry.state !== "active") {
    return blocked(
      "invalid-status",
      "Denne personen står ikke lenger på kortlisten.",
    );
  }
  if (entry.interviewInvitedAt !== undefined) {
    return blocked(
      "invalid-status",
      "Du har allerede invitert denne personen til intervju.",
    );
  }
  return undefined;
}

export function offerBlocker(
  person: Person,
  request: TaskRequest,
  state: DemoState,
  workerId: Id,
): Blocker {
  if (ownerIdOf(state, request) !== person.id) {
    return blocked("not-allowed", "Bare eieren av bedriften kan gi et tilbud.");
  }
  if (request.status !== "shortlisted") {
    return blocked(
      "invalid-status",
      "Du kan bare gi et tilbud når kortlisten er klar og ingen tilbud er sendt.",
    );
  }
  const entry = liveEntry(request, workerId);
  if (entry === undefined || entry.state !== "active") {
    return blocked(
      "invalid-status",
      "Denne personen står ikke lenger på kortlisten.",
    );
  }
  return undefined;
}

export function rejectBlocker(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): Blocker {
  if (ownerIdOf(state, request) !== person.id) {
    return blocked(
      "not-allowed",
      "Bare eieren av bedriften kan avvise kortlisten.",
    );
  }
  if (request.status !== "shortlisted") {
    return blocked(
      "invalid-status",
      "Kortlisten kan bare avvises når den er klar.",
    );
  }
  return undefined;
}

export function acceptBlocker(
  person: Person,
  request: TaskRequest,
  _state: DemoState,
): Blocker {
  if (request.status !== "offered") {
    const isOnShortlist = request.shortlist.some(
      (item) => item.workerId === person.id,
    );
    return isOnShortlist
      ? blocked(
          "invalid-status",
          "Det finnes ikke noe tilbud å godta på dette oppdraget akkurat nå.",
        )
      : blocked(
          "not-allowed",
          "Bare personen som har fått tilbudet kan godta det.",
        );
  }
  const entry = liveEntry(request, person.id);
  if (
    request.offeredWorkerId !== person.id ||
    entry === undefined ||
    entry.state !== "offered"
  ) {
    return blocked(
      "not-allowed",
      "Bare personen som har fått tilbudet kan godta det.",
    );
  }
  return undefined;
}

export function returnToOpenBlocker(
  person: Person,
  request: TaskRequest,
): Blocker {
  if (!isAdmin(person)) {
    return blocked(
      "not-allowed",
      "Bare Varodd-administratorer kan åpne oppdraget igjen.",
    );
  }
  if (request.status !== "under-review") {
    return blocked(
      "invalid-status",
      "Oppdraget kan bare åpnes igjen når det er til vurdering.",
    );
  }
  return undefined;
}

export function startBlocker(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): Blocker {
  if (ownerIdOf(state, request) !== person.id) {
    return blocked(
      "not-allowed",
      "Bare eieren av bedriften kan registrere oppstart.",
    );
  }
  if (request.status !== "agreed") {
    return blocked(
      "invalid-status",
      "Oppstart kan bare registreres mens oppdraget er avtalt.",
    );
  }
  return undefined;
}

export function withdrawBlocker(person: Person, request: TaskRequest): Blocker {
  if (request.agreement?.workerId !== person.id) {
    return blocked(
      "not-allowed",
      "Bare personen som har takket ja til oppdraget kan trekke seg.",
    );
  }
  if (request.status !== "agreed") {
    return blocked(
      "invalid-status",
      "Du kan bare trekke deg mens oppdraget er avtalt og ikke har startet.",
    );
  }
  return undefined;
}

export function completeBlocker(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): Blocker {
  if (ownerIdOf(state, request) !== person.id) {
    return blocked(
      "not-allowed",
      "Bare eieren av bedriften kan markere oppdraget som fullført.",
    );
  }
  if (request.status !== "in-progress") {
    return blocked(
      "invalid-status",
      "Oppdraget kan bare markeres som fullført mens det pågår.",
    );
  }
  return undefined;
}

export function cancelBlocker(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): Blocker {
  if (ownerIdOf(state, request) !== person.id && !isAdmin(person)) {
    return blocked(
      "not-allowed",
      "Bare eieren av bedriften og Varodd-administratorer kan avlyse oppdraget.",
    );
  }
  if (request.status === "completed" || request.status === "cancelled") {
    return blocked(
      "invalid-status",
      "Oppdraget er allerede fullført eller avlyst.",
    );
  }
  return undefined;
}

export function isRequestOwner(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): boolean {
  return ownerIdOf(state, request) === person.id;
}

export function canPublishRequest(
  person: Person,
  businessId: Id,
  state: DemoState,
): boolean {
  return publishBlocker(person, businessId, state) === undefined;
}

export function canEditRequest(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): boolean {
  return editBlocker(person, request, state) === undefined;
}

export function canInviteToInterview(
  person: Person,
  request: TaskRequest,
  state: DemoState,
  workerId: Id,
): boolean {
  return inviteBlocker(person, request, state, workerId) === undefined;
}

export function canMakeOffer(
  person: Person,
  request: TaskRequest,
  state: DemoState,
  workerId: Id,
): boolean {
  return offerBlocker(person, request, state, workerId) === undefined;
}

export function canRejectShortlist(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): boolean {
  return rejectBlocker(person, request, state) === undefined;
}

export function canAcceptOffer(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): boolean {
  return acceptBlocker(person, request, state) === undefined;
}

export function canReturnToOpen(person: Person, request: TaskRequest): boolean {
  return returnToOpenBlocker(person, request) === undefined;
}

export function canRecordStart(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): boolean {
  return startBlocker(person, request, state) === undefined;
}

export function canWithdraw(person: Person, request: TaskRequest): boolean {
  return withdrawBlocker(person, request) === undefined;
}

export function canCompleteRequest(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): boolean {
  return completeBlocker(person, request, state) === undefined;
}

export function canCancelRequest(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): boolean {
  return cancelBlocker(person, request, state) === undefined;
}

export function registerBlocker(person: Person, state: DemoState): Blocker {
  if (!person.seeksWork) {
    return blocked(
      "not-allowed",
      "Bare personer som søker oppdrag kan registrere en profil.",
    );
  }
  const profile = workerProfileOf(person.id, state);
  if (profile !== undefined && !profile.isDraft) {
    return blocked(
      "invalid-status",
      "Du har allerede en profil. Bruk Rediger for å endre den.",
    );
  }
  return undefined;
}

export function updateProfileBlocker(
  person: Person,
  state: DemoState,
): Blocker {
  if (!person.seeksWork) {
    return blocked(
      "not-allowed",
      "Bare personer som søker oppdrag kan endre en profil.",
    );
  }
  const profile = workerProfileOf(person.id, state);
  if (profile === undefined || profile.isDraft) {
    return blocked(
      "invalid-status",
      "Du må registrere profilen før du kan endre den.",
    );
  }
  return undefined;
}

export function navReferralBlocker(
  person: Person,
  personId: Id,
  state: DemoState,
): Blocker {
  if (!isAdmin(person)) {
    return blocked(
      "not-allowed",
      "Bare Varodd-administratorer kan henvise fra NAV.",
    );
  }
  const referred = personById(personId, state);
  if (referred === undefined) {
    return blocked("not-found", "Vi finner ikke personen.");
  }
  if (!referred.seeksWork) {
    return blocked("invalid-status", "Personen søker ikke oppdrag.");
  }
  if (workerProfileOf(personId, state) !== undefined) {
    return blocked("invalid-status", "Personen har allerede en profil.");
  }
  return undefined;
}

export function declineBlocker(
  person: Person,
  request: TaskRequest,
  _state: DemoState,
): Blocker {
  if (request.status !== "offered") {
    const isOnShortlist = request.shortlist.some(
      (item) => item.workerId === person.id,
    );
    return isOnShortlist
      ? blocked(
          "invalid-status",
          "Det finnes ikke noe tilbud å avslå på dette oppdraget akkurat nå.",
        )
      : blocked(
          "not-allowed",
          "Bare personen som har fått tilbudet kan avslå det.",
        );
  }
  const entry = liveEntry(request, person.id);
  if (
    request.offeredWorkerId !== person.id ||
    entry === undefined ||
    entry.state !== "offered"
  ) {
    return blocked(
      "not-allowed",
      "Bare personen som har fått tilbudet kan avslå det.",
    );
  }
  return undefined;
}

export function simulateExpiryBlocker(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): Blocker {
  if (!canSeeRequest(person, request, state)) {
    return blocked("not-allowed", "Du har ikke tilgang til dette oppdraget.");
  }
  if (request.status !== "offered") {
    return blocked(
      "invalid-status",
      "Det finnes ikke noe tilbud som kan utløpe på dette oppdraget.",
    );
  }
  return undefined;
}

export function canRegisterWorkerProfile(
  person: Person,
  state: DemoState,
): boolean {
  return registerBlocker(person, state) === undefined;
}

export function canUpdateWorkerProfile(
  person: Person,
  state: DemoState,
): boolean {
  return updateProfileBlocker(person, state) === undefined;
}

export function canSimulateNavReferral(
  person: Person,
  personId: Id,
  state: DemoState,
): boolean {
  return navReferralBlocker(person, personId, state) === undefined;
}

export function canDeclineOffer(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): boolean {
  return declineBlocker(person, request, state) === undefined;
}

export function canSimulateOfferExpiry(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): boolean {
  return simulateExpiryBlocker(person, request, state) === undefined;
}
