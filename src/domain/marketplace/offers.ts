import type {
  Actor,
  CommandContext,
  CommandHandler,
  DemoState,
  Id,
} from "../frame/types";
import {
  addActivity,
  appendLog,
  byCreatedAt,
  fail,
  findRequest,
  liveEntry,
  omitKey,
  ownerIdOf,
  replaceRequest,
  succeed,
} from "./helpers";
import {
  entryRemovedActivity,
  interviewActivities,
  interviewInvitedLog,
  offerAcceptedActivity,
  offerAcceptedLog,
  offerActivities,
  offerDeclinedLog,
  offerEndedActivity,
  offerExpiredLog,
  offeredLog,
  shortlistEntryRemovedLog,
  statusChangedLog,
} from "./log";
import { fillShortlist } from "./matching";
import type {
  AcceptOfferInput,
  InviteToInterviewInput,
  MakeOfferInput,
  RequestStatus,
} from "./types";

export type EndOfferOptions = {
  actor: Actor;
  simulated?: true;
};

export function endOffer(
  state: DemoState,
  requestId: Id,
  reason: "declined" | "offer-expired",
  context: CommandContext,
  options: EndOfferOptions,
): DemoState {
  const request = findRequest(state, requestId);
  if (
    request === undefined ||
    request.status !== "offered" ||
    request.offeredWorkerId === undefined
  ) {
    return state;
  }
  const workerId = request.offeredWorkerId;
  const simulated = options.simulated === true;
  const ended =
    reason === "declined"
      ? offerDeclinedLog(state, context, options.actor, workerId)
      : offerExpiredLog(state, context, options.actor, workerId, simulated);
  const updated = appendLog(
    {
      ...omitKey(request, "offeredWorkerId"),
      status: "shortlisted",
      excludedWorkerIds: [
        ...request.excludedWorkerIds,
        { workerId, reason, at: context.now },
      ],
      shortlist: request.shortlist.map((item) =>
        item.workerId === workerId && item.state === "offered"
          ? { ...item, state: "removed" as const, removedReason: reason }
          : item,
      ),
    },
    [ended, statusChangedLog(context, options.actor, "offered", "shortlisted")],
  );
  const announced = addActivity(replaceRequest(state, updated), [
    offerEndedActivity(
      state,
      context,
      options.actor,
      updated,
      workerId,
      reason,
      simulated,
    ),
  ]);
  return fillShortlist(updated, announced, context);
}

export const inviteToInterview: CommandHandler = (state, command, context) => {
  const input = command as unknown as InviteToInterviewInput;
  const request = findRequest(state, input.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  if (ownerIdOf(state, request) !== context.actorId) {
    return fail(
      "not-allowed",
      "Bare eieren av bedriften kan invitere til intervju.",
    );
  }
  if (request.status !== "shortlisted" && request.status !== "offered") {
    return fail(
      "invalid-status",
      "Du kan bare invitere til intervju når kortlisten er klar.",
    );
  }
  const entry = liveEntry(request, input.workerId);
  if (entry === undefined || entry.state !== "active") {
    return fail(
      "invalid-status",
      "Denne personen står ikke lenger på kortlisten.",
    );
  }
  if (entry.interviewInvitedAt !== undefined) {
    return fail(
      "invalid-status",
      "Du har allerede invitert denne personen til intervju.",
    );
  }
  const updated = appendLog(
    {
      ...request,
      shortlist: request.shortlist.map((item) =>
        item === entry ? { ...item, interviewInvitedAt: context.now } : item,
      ),
    },
    [interviewInvitedLog(state, context, context.actorId, input.workerId)],
  );
  const next = addActivity(
    replaceRequest(state, updated),
    interviewActivities(
      state,
      context,
      context.actorId,
      updated,
      input.workerId,
    ),
  );
  return succeed(next);
};

export const makeOffer: CommandHandler = (state, command, context) => {
  const input = command as unknown as MakeOfferInput;
  const request = findRequest(state, input.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  if (ownerIdOf(state, request) !== context.actorId) {
    return fail("not-allowed", "Bare eieren av bedriften kan gi et tilbud.");
  }
  if (request.status !== "shortlisted") {
    return fail(
      "invalid-status",
      "Du kan bare gi et tilbud når kortlisten er klar og ingen tilbud er sendt.",
    );
  }
  const entry = liveEntry(request, input.workerId);
  if (entry === undefined || entry.state !== "active") {
    return fail(
      "invalid-status",
      "Denne personen står ikke lenger på kortlisten.",
    );
  }
  const updated = appendLog(
    {
      ...request,
      status: "offered",
      offeredWorkerId: input.workerId,
      shortlist: request.shortlist.map((item) =>
        item === entry
          ? { ...item, state: "offered" as const, offeredAt: context.now }
          : item,
      ),
    },
    [
      offeredLog(state, context, context.actorId, input.workerId),
      statusChangedLog(context, context.actorId, "shortlisted", "offered"),
    ],
  );
  const next = addActivity(
    replaceRequest(state, updated),
    offerActivities(state, context, context.actorId, updated, input.workerId),
  );
  return succeed(next);
};

const statusesWithOtherEntries: RequestStatus[] = [
  "shortlisted",
  "offered",
  "agreed",
  "in-progress",
];

function releaseWorkerElsewhere(
  state: DemoState,
  workerId: Id,
  exceptRequestId: Id,
  context: CommandContext,
): DemoState {
  const affected = state.marketplace.requests
    .filter(
      (item) =>
        item.id !== exceptRequestId &&
        statusesWithOtherEntries.includes(item.status) &&
        liveEntry(item, workerId) !== undefined,
    )
    .sort(byCreatedAt);
  let current = state;
  for (const original of affected) {
    const latest = findRequest(current, original.id);
    const entry =
      latest === undefined ? undefined : liveEntry(latest, workerId);
    if (latest === undefined || entry === undefined) {
      continue;
    }
    if (
      entry.state === "offered" &&
      latest.status === "offered" &&
      latest.offeredWorkerId === workerId
    ) {
      current = endOffer(current, latest.id, "declined", context, {
        actor: "system",
      });
    } else if (entry.state === "active") {
      const removed = appendLog(
        {
          ...latest,
          shortlist: latest.shortlist.map((item) =>
            item === entry
              ? {
                  ...item,
                  state: "removed" as const,
                  removedReason: "accepted-elsewhere" as const,
                }
              : item,
          ),
        },
        [
          shortlistEntryRemovedLog(
            current,
            context,
            "system",
            workerId,
            "accepted-elsewhere",
          ),
        ],
      );
      current = addActivity(replaceRequest(current, removed), [
        entryRemovedActivity(current, context, removed, workerId),
      ]);
      current = fillShortlist(removed, current, context);
    }
  }
  return current;
}

export const acceptOffer: CommandHandler = (state, command, context) => {
  const input = command as unknown as AcceptOfferInput;
  const request = findRequest(state, input.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  const workerId = context.actorId;
  if (request.status !== "offered") {
    const isOnShortlist = request.shortlist.some(
      (item) => item.workerId === workerId,
    );
    return fail(
      isOnShortlist ? "invalid-status" : "not-allowed",
      isOnShortlist
        ? "Det finnes ikke noe tilbud å godta på dette oppdraget akkurat nå."
        : "Bare personen som har fått tilbudet kan godta det.",
    );
  }
  const entry = liveEntry(request, workerId);
  if (
    request.offeredWorkerId !== workerId ||
    entry === undefined ||
    entry.state !== "offered"
  ) {
    return fail(
      "not-allowed",
      "Bare personen som har fått tilbudet kan godta det.",
    );
  }
  const agreed = appendLog(
    {
      ...omitKey(request, "offeredWorkerId"),
      status: "agreed",
      agreement: {
        workerId,
        ownerAgreedAt: entry.offeredAt ?? context.now,
        workerAgreedAt: context.now,
      },
    },
    [
      offerAcceptedLog(state, context, workerId, workerId),
      statusChangedLog(context, workerId, "offered", "agreed"),
    ],
  );
  let next = addActivity(replaceRequest(state, agreed), [
    offerAcceptedActivity(state, context, workerId, agreed, workerId),
  ]);
  next = releaseWorkerElsewhere(next, workerId, request.id, context);
  return succeed(next);
};
