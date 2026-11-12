import { personById } from "../frame/people";
import type {
  ActivityEntry,
  Actor,
  Audience,
  CommandContext,
  DemoState,
  Id,
} from "../frame/types";
import { businessNameOf, ownerIdOf, workersGroup } from "./helpers";
import type {
  ExclusionReason,
  ExperienceLevel,
  LogEvent,
  LogEventKind,
  Outcome,
  RequestStatus,
  TaskRequest,
  WorkLocation,
} from "./types";

const statusLabels: Record<RequestStatus, string> = {
  open: "Åpen",
  shortlisted: "Kortliste klar",
  offered: "Tilbud sendt",
  agreed: "Avtalt",
  "in-progress": "Pågår",
  completed: "Fullført",
  cancelled: "Avlyst",
  "under-review": "Til vurdering",
};

const experienceLabels: Record<ExperienceLevel, string> = {
  junior: "Junior",
  mid: "Erfaren",
  senior: "Senior",
};

const workLocationLabels: Record<WorkLocation, string> = {
  remote: "Fjernarbeid",
  onsite: "På stedet",
};

const outcomeLabels: Record<Outcome, string> = {
  "as-planned": "Som planlagt",
  extended: "Ble forlenget",
  permanent: "Ble fast ansettelse",
  "not-completed": "Ikke fullført",
};

export function statusLabel(status: RequestStatus): string {
  return statusLabels[status];
}

export function experienceLabel(level: ExperienceLevel): string {
  return experienceLabels[level];
}

export function workLocationLabel(location: WorkLocation): string {
  return workLocationLabels[location];
}

export function outcomeLabel(outcome: Outcome): string {
  return outcomeLabels[outcome];
}

export function personName(state: DemoState, id: Actor): string {
  if (id === "system") {
    return "System";
  }
  return personById(id, state)?.name ?? "Ukjent person";
}

function event(
  context: CommandContext,
  actor: Actor,
  kind: LogEventKind,
  text: string,
  extra: Partial<LogEvent> = {},
): LogEvent {
  return { id: context.newId(), at: context.now, actor, kind, text, ...extra };
}

export function publishedLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
): LogEvent {
  return event(
    context,
    actor,
    "published",
    `${personName(state, actor)} publiserte oppdraget`,
  );
}

export function editedLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
): LogEvent {
  return event(
    context,
    actor,
    "edited",
    `${personName(state, actor)} endret oppdraget`,
  );
}

export function durationNoticeLog(
  context: CommandContext,
  actor: Actor,
): LogEvent {
  return event(
    context,
    actor,
    "duration-notice",
    "Varigheten er utenfor det vanlige (2 uker til 6 måneder)",
  );
}

export function shortlistedLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  workerId: Id,
): LogEvent {
  return event(
    context,
    actor,
    "shortlisted",
    `${personName(state, workerId)} ble lagt til på kortlisten`,
    { workerId },
  );
}

export function shortlistEntryRemovedLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  workerId: Id,
  reason?: ExclusionReason | "accepted-elsewhere",
): LogEvent {
  const name = personName(state, workerId);
  const text =
    reason === "accepted-elsewhere"
      ? `${name} ble tatt av kortlisten fordi personen takket ja til et annet oppdrag`
      : `${name} ble tatt av kortlisten`;
  return event(context, actor, "shortlist-entry-removed", text, { workerId });
}

export function interviewInvitedLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  workerId: Id,
): LogEvent {
  return event(
    context,
    actor,
    "interview-invited",
    `${personName(state, actor)} inviterte ${personName(state, workerId)} til intervju`,
    { workerId },
  );
}

export function offeredLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  workerId: Id,
): LogEvent {
  return event(
    context,
    actor,
    "offered",
    `${personName(state, actor)} ga ${personName(state, workerId)} et tilbud`,
    { workerId },
  );
}

export function offerAcceptedLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  workerId: Id,
): LogEvent {
  return event(
    context,
    actor,
    "offer-accepted",
    `${personName(state, workerId)} godtok tilbudet`,
    { workerId },
  );
}

export function offerDeclinedLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  workerId: Id,
): LogEvent {
  const name = personName(state, workerId);
  const text =
    actor === workerId
      ? `${name} avslo tilbudet`
      : `Tilbudet til ${name} regnes som avslått`;
  return event(context, actor, "offer-declined", text, { workerId });
}

export function offerExpiredLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  workerId: Id,
  simulated = false,
): LogEvent {
  const name = personName(state, workerId);
  const text = simulated
    ? `Tilbudet til ${name} utløp. Simulert med feilsøkingsknappen`
    : `Tilbudet til ${name} utløp fordi det ikke ble besvart på 7 dager`;
  return event(
    context,
    actor,
    "offer-expired",
    text,
    simulated ? { workerId, simulated: true } : { workerId },
  );
}

export function shortlistRejectedLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
): LogEvent {
  return event(
    context,
    actor,
    "shortlist-rejected",
    `${personName(state, actor)} avviste hele kortlisten`,
  );
}

export function returnedToOpenLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
): LogEvent {
  return event(
    context,
    actor,
    "returned-to-open",
    `${personName(state, actor)} åpnet oppdraget igjen`,
  );
}

export function startedLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  workerId?: Id,
): LogEvent {
  return event(
    context,
    actor,
    "started",
    `${personName(state, actor)} registrerte oppstart av oppdraget`,
    workerId === undefined ? {} : { workerId },
  );
}

export function withdrewLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  workerId: Id,
): LogEvent {
  return event(
    context,
    actor,
    "withdrew",
    `${personName(state, workerId)} trakk seg fra oppdraget`,
    { workerId },
  );
}

export function completedLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  outcome: Outcome,
  workerId?: Id,
): LogEvent {
  return event(
    context,
    actor,
    "completed",
    `${personName(state, actor)} markerte oppdraget som fullført: ${outcomeLabel(outcome)}`,
    workerId === undefined ? {} : { workerId },
  );
}

export function cancelledLog(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  workerId?: Id,
): LogEvent {
  return event(
    context,
    actor,
    "cancelled",
    `${personName(state, actor)} avlyste oppdraget`,
    workerId === undefined ? {} : { workerId },
  );
}

export function messageSentLog(
  state: DemoState,
  context: CommandContext,
  authorId: Id,
  recipientId: Id,
  workerId: Id,
): LogEvent {
  return event(
    context,
    authorId,
    "message-sent",
    `${personName(state, authorId)} sendte en melding til ${personName(state, recipientId)}`,
    { workerId },
  );
}

export function statusChangedLog(
  context: CommandContext,
  actor: Actor,
  fromStatus: RequestStatus,
  toStatus: RequestStatus,
): LogEvent {
  return event(
    context,
    actor,
    "status-changed",
    `Status endret fra ${statusLabel(fromStatus)} til ${statusLabel(toStatus)}`,
    { fromStatus, toStatus },
  );
}

function activity(
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
  text: string,
  audience: Audience,
): ActivityEntry {
  return {
    id: context.newId(),
    at: context.now,
    featureId: "marketplace",
    actor,
    text,
    target: { route: `/oppdrag/${request.id}` },
    audience,
  };
}

function people(...personIds: Id[]): Audience {
  return { personIds, groups: [] };
}

function candidateWord(count: number): string {
  return count === 1 ? "kandidat" : "kandidater";
}

export function newRequestActivity(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
): ActivityEntry {
  const ownerId = ownerIdOf(state, request);
  return activity(
    context,
    actor,
    request,
    `Nytt oppdrag: «${request.title}» hos ${businessNameOf(state, request)}`,
    {
      personIds: ownerId === undefined ? [] : [ownerId],
      groups: [workersGroup],
    },
  );
}

export function shortlistActivity(
  state: DemoState,
  context: CommandContext,
  request: TaskRequest,
  addedWorkerIds: Id[],
  totalCount: number,
  isFirst: boolean,
): ActivityEntry {
  const ownerId = ownerIdOf(state, request);
  const text = isFirst
    ? `${businessNameOf(state, request)} har fått en kortliste med ${totalCount} ${candidateWord(totalCount)}`
    : `Kortlisten for «${request.title}» har fått ${addedWorkerIds.length} ny ${candidateWord(addedWorkerIds.length)}`;
  return activity(
    context,
    "system",
    request,
    text,
    people(...(ownerId === undefined ? [] : [ownerId]), ...addedWorkerIds),
  );
}

export function interviewActivities(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
  workerId: Id,
): ActivityEntry[] {
  const ownerId = ownerIdOf(state, request);
  return [
    activity(
      context,
      actor,
      request,
      `Du er invitert til intervju for «${request.title}»`,
      people(workerId),
    ),
    activity(
      context,
      actor,
      request,
      `Du har invitert ${personName(state, workerId)} til intervju for «${request.title}»`,
      people(...(ownerId === undefined ? [] : [ownerId])),
    ),
  ];
}

export function offerActivities(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
  workerId: Id,
): ActivityEntry[] {
  const ownerId = ownerIdOf(state, request);
  return [
    activity(
      context,
      actor,
      request,
      `Du har fått et tilbud på «${request.title}»`,
      people(workerId),
    ),
    activity(
      context,
      actor,
      request,
      `Du har gitt ${personName(state, workerId)} et tilbud på «${request.title}»`,
      people(...(ownerId === undefined ? [] : [ownerId])),
    ),
  ];
}

export function offerAcceptedActivity(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
  workerId: Id,
): ActivityEntry {
  const ownerId = ownerIdOf(state, request);
  return activity(
    context,
    actor,
    request,
    `${personName(state, workerId)} har godtatt tilbudet på «${request.title}». Oppdraget er avtalt`,
    people(...(ownerId === undefined ? [] : [ownerId]), workerId),
  );
}

export function entryRemovedActivity(
  state: DemoState,
  context: CommandContext,
  request: TaskRequest,
  workerId: Id,
): ActivityEntry {
  const ownerId = ownerIdOf(state, request);
  return activity(
    context,
    "system",
    request,
    `${personName(state, workerId)} er ikke lenger på kortlisten for «${request.title}» fordi personen har takket ja til et annet oppdrag`,
    people(...(ownerId === undefined ? [] : [ownerId])),
  );
}

export function offerEndedActivity(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
  workerId: Id,
  reason: "declined" | "offer-expired",
  simulated = false,
): ActivityEntry {
  const ownerId = ownerIdOf(state, request);
  const name = personName(state, workerId);
  let text = `${name} har avslått tilbudet på «${request.title}»`;
  if (reason === "offer-expired") {
    text = `Tilbudet til ${name} på «${request.title}» har utløpt`;
    if (simulated) {
      text = `${text} (simulert)`;
    }
  } else if (actor !== workerId) {
    text = `Tilbudet til ${name} på «${request.title}» regnes som avslått`;
  }
  return activity(
    context,
    actor,
    request,
    text,
    people(...(ownerId === undefined ? [] : [ownerId]), workerId),
  );
}

export function shortlistRejectedActivity(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
  removedWorkerIds: Id[],
): ActivityEntry {
  const ownerId = ownerIdOf(state, request);
  return activity(
    context,
    actor,
    request,
    `Kortlisten for «${request.title}» er avvist og oppdraget venter på vurdering`,
    people(...(ownerId === undefined ? [] : [ownerId]), ...removedWorkerIds),
  );
}

export function returnedToOpenActivity(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
): ActivityEntry {
  const ownerId = ownerIdOf(state, request);
  return activity(
    context,
    actor,
    request,
    `Oppdraget er åpent igjen: «${request.title}»`,
    {
      personIds: ownerId === undefined ? [] : [ownerId],
      groups: [workersGroup],
    },
  );
}

function ownerAnd(
  state: DemoState,
  request: TaskRequest,
  ...personIds: Id[]
): Audience {
  const ownerId = ownerIdOf(state, request);
  const ids = [...(ownerId === undefined ? [] : [ownerId]), ...personIds];
  return people(...new Set(ids));
}

export function startedActivity(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
): ActivityEntry {
  return activity(
    context,
    actor,
    request,
    `Oppdraget «${request.title}» er i gang`,
    ownerAnd(
      state,
      request,
      ...(request.agreement === undefined ? [] : [request.agreement.workerId]),
    ),
  );
}

export function withdrewActivity(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
  workerId: Id,
): ActivityEntry {
  return activity(
    context,
    actor,
    request,
    `${personName(state, workerId)} har trukket seg fra «${request.title}»`,
    ownerAnd(state, request, workerId),
  );
}

export function completedActivity(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
  outcome: Outcome,
): ActivityEntry {
  return activity(
    context,
    actor,
    request,
    `Oppdraget «${request.title}» er fullført: ${outcomeLabel(outcome)}`,
    ownerAnd(
      state,
      request,
      ...(request.agreement === undefined ? [] : [request.agreement.workerId]),
    ),
  );
}

export function cancelledActivity(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
): ActivityEntry {
  const activeWorkerIds = request.shortlist
    .filter((item) => item.state === "active")
    .map((item) => item.workerId);
  return activity(
    context,
    actor,
    request,
    `Oppdraget «${request.title}» er avlyst`,
    ownerAnd(
      state,
      request,
      ...activeWorkerIds,
      ...(request.offeredWorkerId === undefined
        ? []
        : [request.offeredWorkerId]),
      ...(request.agreement === undefined ? [] : [request.agreement.workerId]),
    ),
  );
}

export function messageActivity(
  state: DemoState,
  context: CommandContext,
  actor: Actor,
  request: TaskRequest,
  recipientId: Id,
): ActivityEntry {
  return activity(
    context,
    actor,
    request,
    `Ny melding fra ${personName(state, actor)} om «${request.title}»`,
    people(recipientId),
  );
}

export function profileReadyActivity(
  context: CommandContext,
  workerId: Id,
): ActivityEntry {
  return {
    id: context.newId(),
    at: context.now,
    featureId: "marketplace",
    actor: workerId,
    text: "Profilen din er klar",
    target: { route: "/profil" },
    audience: people(workerId),
  };
}

export function crawlActivity(
  context: CommandContext,
  actor: Actor,
  ownerId: Id,
): ActivityEntry {
  return {
    id: context.newId(),
    at: context.now,
    featureId: "marketplace",
    actor,
    text: "Nye forslag til ferdigheter (simulert)",
    target: { route: "/bedrift" },
    audience: people(ownerId),
  };
}

export function navReferralActivity(
  context: CommandContext,
  actor: Actor,
  personId: Id,
): ActivityEntry {
  return {
    id: context.newId(),
    at: context.now,
    featureId: "marketplace",
    actor,
    text: "Du er henvist fra NAV (simulert)",
    target: { route: "/profil" },
    audience: people(personId),
  };
}
