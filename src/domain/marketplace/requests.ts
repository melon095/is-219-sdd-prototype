import type { CommandHandler, DemoState, Notice } from "../frame/types";
import {
  actorOf,
  addActivity,
  appendLog,
  fail,
  failWith,
  findRequest,
  isValidDate,
  omitKey,
  readText,
  replaceRequest,
  succeed,
  validationFailure,
} from "./helpers";
import {
  durationNoticeLog,
  editedLog,
  newRequestActivity,
  publishedLog,
  returnedToOpenActivity,
  returnedToOpenLog,
  shortlistRejectedActivity,
  shortlistRejectedLog,
  statusChangedLog,
} from "./log";
import { fillShortlist } from "./matching";
import {
  editBlocker,
  publishBlocker,
  rejectBlocker,
  returnToOpenBlocker,
} from "./permissions";
import type {
  EditRequestInput,
  EstimatedDuration,
  PublishRequestInput,
  RejectShortlistInput,
  RequestFields,
  ReturnToOpenInput,
  TaskRequest,
} from "./types";

export function durationNotice(
  duration: EstimatedDuration,
): Notice | undefined {
  const unusual =
    duration.unit === "weeks"
      ? duration.amount < 2 || duration.amount > 26
      : duration.amount > 6;
  if (!unusual) {
    return undefined;
  }
  return {
    kind: "warning",
    message:
      "Varigheten er utenfor det vanlige (2 uker til 6 måneder). Du kan fortsatt publisere oppdraget.",
  };
}

type FieldsResult =
  | { fields: RequestFields; errors: undefined }
  | { fields: undefined; errors: Record<string, string> };

function readFields(
  input: Record<string, unknown>,
  state: DemoState,
): FieldsResult {
  const errors: Record<string, string> = {};

  const title = readText(input.title);
  if (title.length < 1 || title.length > 100) {
    errors.title = "Skriv en tittel på 1–100 tegn.";
  }

  const description = readText(input.description);
  if (description.length < 1 || description.length > 4000) {
    errors.description = "Beskriv oppdraget med 1–4000 tegn.";
  }

  const knownSkills = new Set(state.frame.skills.map((skill) => skill.id));
  const rawSkills = Array.isArray(input.requiredSkillIds)
    ? input.requiredSkillIds
    : [];
  const requiredSkillIds = [
    ...new Set(rawSkills.filter((id): id is string => typeof id === "string")),
  ];
  if (requiredSkillIds.length < 1) {
    errors.requiredSkillIds = "Velg minst én ferdighet.";
  } else if (requiredSkillIds.some((id) => !knownSkills.has(id))) {
    errors.requiredSkillIds = "Vi kjenner ikke igjen en av ferdighetene.";
  }

  const rawSuggestions = Array.isArray(input.acceptedSuggestionIds)
    ? input.acceptedSuggestionIds
    : [];
  const acceptedSuggestionIds = [
    ...new Set(
      rawSuggestions.filter((id): id is string => typeof id === "string"),
    ),
  ];
  if (acceptedSuggestionIds.some((id) => !knownSkills.has(id))) {
    errors.acceptedSuggestionIds = "Vi kjenner ikke igjen et av forslagene.";
  }

  const startDate = input.desiredStartDate;
  if (!isValidDate(startDate)) {
    errors.desiredStartDate = "Velg ønsket startdato.";
  }

  const duration = input.estimatedDuration;
  const durationRecord =
    typeof duration === "object" && duration !== null
      ? (duration as Record<string, unknown>)
      : {};
  const amount = durationRecord.amount;
  const unit = durationRecord.unit;
  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount < 1 ||
    (unit !== "weeks" && unit !== "months")
  ) {
    errors.estimatedDuration =
      "Oppgi varigheten som et helt tall på minst 1, med uker eller måneder.";
  }

  const hours = input.hoursPerWeek;
  if (
    typeof hours !== "number" ||
    !Number.isInteger(hours) ||
    hours < 1 ||
    hours > 60
  ) {
    errors.hoursPerWeek = "Oppgi timer per uke som et helt tall fra 1 til 60.";
  }

  const location = input.workLocation;
  if (location !== "remote" && location !== "onsite") {
    errors.workLocation = "Velg om arbeidet er fjernarbeid eller på stedet.";
  }

  if (
    Object.keys(errors).length > 0 ||
    typeof startDate !== "string" ||
    typeof amount !== "number" ||
    (unit !== "weeks" && unit !== "months") ||
    typeof hours !== "number" ||
    (location !== "remote" && location !== "onsite")
  ) {
    return { fields: undefined, errors };
  }

  const additional = readText(input.additionalRequirements);
  const fields: RequestFields = {
    title,
    description,
    requiredSkillIds,
    acceptedSuggestionIds,
    desiredStartDate: startDate,
    estimatedDuration: { amount, unit },
    hoursPerWeek: hours,
    workLocation: location,
  };
  if (additional.length > 0) {
    fields.additionalRequirements = additional;
  }
  return { fields, errors: undefined };
}

export const publishRequest: CommandHandler = (state, command, context) => {
  const input = command as unknown as PublishRequestInput;
  const blocker = publishBlocker(
    actorOf(state, context),
    input.businessId,
    state,
  );
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  const business = state.frame.businesses.find(
    (item) => item.id === input.businessId,
  );
  if (business === undefined) {
    return fail("not-found", "Vi finner ikke bedriften.");
  }
  const parsed = readFields(command, state);
  if (parsed.fields === undefined) {
    return validationFailure(parsed.errors);
  }
  const fields = parsed.fields;
  const notice = durationNotice(fields.estimatedDuration);
  const draft: TaskRequest = {
    id: context.newId(),
    businessId: business.id,
    ...fields,
    status: "open",
    createdAt: context.now,
    shortlist: [],
    excludedWorkerIds: [],
    log: [],
  };
  const events = [publishedLog(state, context, context.actorId)];
  if (notice !== undefined) {
    events.push(durationNoticeLog(context, context.actorId));
  }
  const published = appendLog(draft, events);
  let next: DemoState = {
    ...state,
    marketplace: {
      ...state.marketplace,
      requests: [...state.marketplace.requests, published],
    },
  };
  next = addActivity(next, [
    newRequestActivity(next, context, context.actorId, published),
  ]);
  next = fillShortlist(published, next, context);
  return succeed(next, notice === undefined ? [] : [notice]);
};

export const editRequest: CommandHandler = (state, command, context) => {
  const input = command as unknown as EditRequestInput;
  const request = findRequest(state, input.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  const blocker = editBlocker(actorOf(state, context), request, state);
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  const parsed = readFields(command, state);
  if (parsed.fields === undefined) {
    return validationFailure(parsed.errors);
  }
  const fields = parsed.fields;
  const notice = durationNotice(fields.estimatedDuration);
  const events = [editedLog(state, context, context.actorId)];
  if (notice !== undefined) {
    events.push(durationNoticeLog(context, context.actorId));
  }
  const edited = appendLog(
    { ...omitKey(request, "additionalRequirements"), ...fields },
    events,
  );
  const next = fillShortlist(edited, replaceRequest(state, edited), context);
  return succeed(next, notice === undefined ? [] : [notice]);
};

export const rejectShortlist: CommandHandler = (state, command, context) => {
  const input = command as unknown as RejectShortlistInput;
  const request = findRequest(state, input.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  const blocker = rejectBlocker(actorOf(state, context), request, state);
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  const reason = readText(input.reason);
  if (reason.length < 1 || reason.length > 1000) {
    return validationFailure({
      reason: "Skriv en begrunnelse på 1–1000 tegn.",
    });
  }
  const removedIds = request.shortlist
    .filter((item) => item.state === "active")
    .map((item) => item.workerId);
  const updated = appendLog(
    {
      ...request,
      status: "under-review",
      rejection: { reason, at: context.now },
      excludedWorkerIds: [
        ...request.excludedWorkerIds,
        ...removedIds.map((workerId) => ({
          workerId,
          reason: "shortlist-rejected" as const,
          at: context.now,
        })),
      ],
      shortlist: request.shortlist.map((item) =>
        item.state === "active"
          ? {
              ...item,
              state: "removed" as const,
              removedReason: "shortlist-rejected" as const,
            }
          : item,
      ),
    },
    [
      shortlistRejectedLog(state, context, context.actorId),
      statusChangedLog(context, context.actorId, "shortlisted", "under-review"),
    ],
  );
  const next = addActivity(replaceRequest(state, updated), [
    shortlistRejectedActivity(
      state,
      context,
      context.actorId,
      updated,
      removedIds,
    ),
  ]);
  return succeed(next);
};

export const returnToOpen: CommandHandler = (state, command, context) => {
  const input = command as unknown as ReturnToOpenInput;
  const request = findRequest(state, input.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  const blocker = returnToOpenBlocker(actorOf(state, context), request);
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  const reopened = appendLog({ ...request, status: "open" }, [
    returnedToOpenLog(state, context, context.actorId),
    statusChangedLog(context, context.actorId, "under-review", "open"),
  ]);
  let next = replaceRequest(state, reopened);
  next = addActivity(next, [
    returnedToOpenActivity(next, context, context.actorId, reopened),
  ]);
  return succeed(fillShortlist(reopened, next, context));
};
