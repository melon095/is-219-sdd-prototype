import {
  actorOf,
  addActivity,
  fail,
  failWith,
  isValidDate,
  omitKey,
  readText,
  succeed,
  validationFailure,
} from "../frame/commandHelpers";
import type { CommandHandler } from "../frame/types";
import { appendLog, findRequest, replaceRequest } from "./helpers";
import {
  cancelledActivity,
  cancelledLog,
  completedActivity,
  completedLog,
  startedActivity,
  startedLog,
  statusChangedLog,
  withdrewActivity,
  withdrewLog,
} from "./log";
import { fillRequestsWithRoom, fillShortlist } from "./matching";
import {
  cancelBlocker,
  completeBlocker,
  startBlocker,
  withdrawBlocker,
} from "./permissions";
import type {
  CancelRequestInput,
  CompleteRequestInput,
  Outcome,
  RecordStartInput,
  WithdrawInput,
} from "./types";

const completionOutcomes: Outcome[] = ["as-planned", "extended", "permanent"];

export const recordStart: CommandHandler = (state, command, context) => {
  const input = command as unknown as RecordStartInput;
  const request = findRequest(state, input.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  const blocker = startBlocker(actorOf(state, context), request, state);
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  if (!isValidDate(input.actualStartDate)) {
    return validationFailure({
      actualStartDate: "Velg datoen oppdraget startet.",
    });
  }
  const started = appendLog(
    {
      ...request,
      status: "in-progress",
      actualStartDate: input.actualStartDate,
    },
    [
      startedLog(state, context, context.actorId, request.agreement?.workerId),
      statusChangedLog(context, context.actorId, "agreed", "in-progress"),
    ],
  );
  return succeed(
    addActivity(replaceRequest(state, started), [
      startedActivity(state, context, context.actorId, started),
    ]),
  );
};

export const withdraw: CommandHandler = (state, command, context) => {
  const input = command as unknown as WithdrawInput;
  const request = findRequest(state, input.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  const blocker = withdrawBlocker(actorOf(state, context), request);
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  const workerId = context.actorId;
  const reopened = appendLog(
    {
      ...omitKey(request, "agreement"),
      status: "open",
      excludedWorkerIds: [
        ...request.excludedWorkerIds,
        { workerId, reason: "withdrew", at: context.now },
      ],
      shortlist: request.shortlist.map((item) =>
        item.workerId === workerId && item.state !== "removed"
          ? {
              ...item,
              state: "removed" as const,
              removedReason: "withdrew" as const,
            }
          : item,
      ),
    },
    [
      withdrewLog(state, context, workerId, workerId),
      statusChangedLog(context, workerId, "agreed", "open"),
    ],
  );
  let next = addActivity(replaceRequest(state, reopened), [
    withdrewActivity(state, context, workerId, reopened, workerId),
  ]);
  next = fillShortlist(reopened, next, context);
  return succeed(fillRequestsWithRoom(next, context));
};

export const completeRequest: CommandHandler = (state, command, context) => {
  const input = command as unknown as CompleteRequestInput;
  const request = findRequest(state, input.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  const blocker = completeBlocker(actorOf(state, context), request, state);
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  const outcome = completionOutcomes.find((item) => item === input.outcome);
  if (outcome === undefined) {
    return validationFailure({
      outcome: "Velg hvordan oppdraget gikk.",
    });
  }
  const completed = appendLog({ ...request, status: "completed", outcome }, [
    completedLog(
      state,
      context,
      context.actorId,
      outcome,
      request.agreement?.workerId,
    ),
    statusChangedLog(context, context.actorId, "in-progress", "completed"),
  ]);
  const next = addActivity(replaceRequest(state, completed), [
    completedActivity(state, context, context.actorId, completed, outcome),
  ]);
  return succeed(fillRequestsWithRoom(next, context));
};

export const cancelRequest: CommandHandler = (state, command, context) => {
  const input = command as unknown as CancelRequestInput;
  const request = findRequest(state, input.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  const blocker = cancelBlocker(actorOf(state, context), request, state);
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  const reason = readText(input.reason);
  if (reason.length < 1 || reason.length > 1000) {
    return validationFailure({
      reason: "Skriv en begrunnelse på 1–1000 tegn.",
    });
  }
  const hadWorker =
    request.status === "agreed" || request.status === "in-progress";
  const cancelled = appendLog(
    {
      ...omitKey(request, "offeredWorkerId"),
      status: "cancelled",
      cancellation: { reason, at: context.now, by: context.actorId },
      ...(hadWorker ? { outcome: "not-completed" as const } : {}),
    },
    [
      cancelledLog(
        state,
        context,
        context.actorId,
        request.agreement?.workerId,
      ),
      statusChangedLog(context, context.actorId, request.status, "cancelled"),
    ],
  );
  const next = addActivity(replaceRequest(state, cancelled), [
    cancelledActivity(state, context, context.actorId, request),
  ]);
  return succeed(hadWorker ? fillRequestsWithRoom(next, context) : next);
};
