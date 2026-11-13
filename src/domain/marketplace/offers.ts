import type {
  Actor,
  CommandContext,
  CommandHandler,
  DemoState,
  Id,
  IsoDateTime,
} from "../frame/types";
import {
  actorOf,
  addActivity,
  appendLog,
  byCreatedAt,
  fail,
  failWith,
  findRequest,
  liveEntry,
  omitKey,
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
import {
  acceptBlocker,
  declineBlocker,
  inviteBlocker,
  offerBlocker,
  simulateExpiryBlocker,
} from "./permissions";
import type {
  AcceptOfferInput,
  DeclineOfferInput,
  InviteToInterviewInput,
  MakeOfferInput,
  RequestStatus,
  SimulateOfferExpiryInput,
  TaskRequest,
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
  const blocker = inviteBlocker(
    actorOf(state, context),
    request,
    state,
    input.workerId,
  );
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  const updated = appendLog(
    {
      ...request,
      shortlist: request.shortlist.map((item) =>
        item.workerId === input.workerId && item.state !== "removed"
          ? { ...item, interviewInvitedAt: context.now }
          : item,
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
  const blocker = offerBlocker(
    actorOf(state, context),
    request,
    state,
    input.workerId,
  );
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  const updated = appendLog(
    {
      ...request,
      status: "offered",
      offeredWorkerId: input.workerId,
      shortlist: request.shortlist.map((item) =>
        item.workerId === input.workerId && item.state !== "removed"
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
  const blocker = acceptBlocker(actorOf(state, context), request, state);
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  const agreed = appendLog(
    {
      ...omitKey(request, "offeredWorkerId"),
      status: "agreed",
      agreement: {
        workerId,
        ownerAgreedAt: liveEntry(request, workerId)?.offeredAt ?? context.now,
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

export const declineOffer: CommandHandler = (state, command, context) => {
  const input = command as unknown as DeclineOfferInput;
  const request = findRequest(state, input.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  const blocker = declineBlocker(actorOf(state, context), request, state);
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  return succeed(
    endOffer(state, request.id, "declined", context, {
      actor: context.actorId,
    }),
  );
};

export const simulateOfferExpiry: CommandHandler = (
  state,
  command,
  context,
) => {
  const input = command as unknown as SimulateOfferExpiryInput;
  const request = findRequest(state, input.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  const blocker = simulateExpiryBlocker(
    actorOf(state, context),
    request,
    state,
  );
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  return succeed(
    endOffer(state, request.id, "offer-expired", context, {
      actor: "system",
      simulated: true,
    }),
  );
};

const offerLifetimeMs = 7 * 24 * 60 * 60 * 1000;

function hasOverdueOffer(request: TaskRequest, nowMs: number): boolean {
  if (request.status !== "offered" || request.offeredWorkerId === undefined) {
    return false;
  }
  const entry = liveEntry(request, request.offeredWorkerId);
  return (
    entry !== undefined &&
    entry.state === "offered" &&
    entry.offeredAt !== undefined &&
    nowMs - Date.parse(entry.offeredAt) > offerLifetimeMs
  );
}

export function expireOverdueOffers(
  state: DemoState,
  now: IsoDateTime,
): DemoState {
  const nowMs = Date.parse(now);
  const overdue = state.marketplace.requests
    .filter((request) => hasOverdueOffer(request, nowMs))
    .sort(byCreatedAt);
  if (overdue.length === 0) {
    return state;
  }
  let counter = 0;
  const context: CommandContext = {
    actorId: "system",
    now,
    newId: () => {
      counter += 1;
      return `system-${now}-${counter}`;
    },
  };
  let current = state;
  for (const request of overdue) {
    current = endOffer(current, request.id, "offer-expired", context, {
      actor: "system",
    });
  }
  return current;
}
