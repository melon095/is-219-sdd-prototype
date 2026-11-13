import { isAdmin, workerProfileOf } from "../frame/people";
import type { DemoState, Person } from "../frame/types";
import { liveEntry, ownerIdOf } from "./helpers";
import type { Conversation, LogEvent, TaskRequest } from "./types";

export function isActiveWorker(person: Person, state: DemoState): boolean {
  const profile = workerProfileOf(person.id, state);
  return profile !== undefined && !profile.isDraft;
}

export function canSeeRequest(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): boolean {
  if (isAdmin(person)) {
    return true;
  }
  if (ownerIdOf(state, request) === person.id) {
    return true;
  }
  if (!isActiveWorker(person, state)) {
    return false;
  }
  return (
    request.status === "open" ||
    liveEntry(request, person.id) !== undefined ||
    request.agreement?.workerId === person.id
  );
}

export function visibleRequests(
  person: Person,
  state: DemoState,
): TaskRequest[] {
  return state.marketplace.requests.filter((request) =>
    canSeeRequest(person, request, state),
  );
}

export function canSeeRequestTitle(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): boolean {
  return canSeeRequest(person, request, state) || isActiveWorker(person, state);
}

export function visibleLogEvents(
  person: Person,
  request: TaskRequest,
  state: DemoState,
): LogEvent[] {
  if (isAdmin(person) || ownerIdOf(state, request) === person.id) {
    return request.log;
  }
  return request.log.filter(
    (event) => event.workerId === person.id || event.kind === "status-changed",
  );
}

export function canSeeConversation(
  person: Person,
  conversation: Conversation,
): boolean {
  return (
    isAdmin(person) ||
    conversation.ownerId === person.id ||
    conversation.workerId === person.id
  );
}

export function canSendMessage(
  person: Person,
  conversation: Conversation,
  request: TaskRequest,
): boolean {
  if (
    person.id !== conversation.ownerId &&
    person.id !== conversation.workerId
  ) {
    return false;
  }
  if (conversation.requestId !== request.id) {
    return false;
  }
  if (request.status === "completed" || request.status === "cancelled") {
    return false;
  }
  return (
    liveEntry(request, conversation.workerId) !== undefined ||
    request.agreement?.workerId === conversation.workerId
  );
}
