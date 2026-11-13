import type { CommandContext, DemoState, Id } from "../frame/types";
import {
  addActivity,
  appendLog,
  byCreatedAt,
  maxShortlistSize,
  replaceRequest,
} from "./helpers";
import { shortlistActivity, shortlistedLog, statusChangedLog } from "./log";
import type {
  LogEvent,
  RequestStatus,
  ShortlistEntry,
  TaskRequest,
  WorkerProfile,
} from "./types";

const matchableStatuses: RequestStatus[] = ["open", "shortlisted", "offered"];

export type RankedCandidate = {
  worker: WorkerProfile;
  matchedSkillIds: Id[];
  missingSkillIds: Id[];
};

export function isCompleteProfile(worker: WorkerProfile): boolean {
  return (
    worker.skillIds.length >= 1 &&
    worker.experienceLevel !== undefined &&
    worker.availableFrom !== undefined
  );
}

export function isBusy(worker: WorkerProfile, state: DemoState): boolean {
  return state.marketplace.requests.some(
    (request) =>
      (request.status === "agreed" || request.status === "in-progress") &&
      request.agreement?.workerId === worker.personId,
  );
}

export function isEligibleForMatching(
  worker: WorkerProfile,
  state: DemoState,
): boolean {
  return !worker.isDraft && isCompleteProfile(worker) && !isBusy(worker, state);
}

function compareNumbers(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function timeOrDefault(value: string | undefined, fallback: number): number {
  return value === undefined ? fallback : Date.parse(value);
}

function compareCandidates(a: RankedCandidate, b: RankedCandidate): number {
  const share = b.matchedSkillIds.length - a.matchedSkillIds.length;
  if (share !== 0) {
    return share;
  }
  const available = compareText(
    a.worker.availableFrom ?? "",
    b.worker.availableFrom ?? "",
  );
  if (available !== 0) {
    return available;
  }
  const shortlisted = compareNumbers(
    timeOrDefault(a.worker.lastShortlistedAt, Number.NEGATIVE_INFINITY),
    timeOrDefault(b.worker.lastShortlistedAt, Number.NEGATIVE_INFINITY),
  );
  if (shortlisted !== 0) {
    return shortlisted;
  }
  const eligible = compareNumbers(
    timeOrDefault(a.worker.eligibleSince, Number.POSITIVE_INFINITY),
    timeOrDefault(b.worker.eligibleSince, Number.POSITIVE_INFINITY),
  );
  if (eligible !== 0) {
    return eligible;
  }
  return compareText(a.worker.personId, b.worker.personId);
}

export function rankCandidates(
  request: Pick<TaskRequest, "requiredSkillIds" | "desiredStartDate">,
  workers: WorkerProfile[],
): RankedCandidate[] {
  const required = [...new Set(request.requiredSkillIds)];
  const candidates: RankedCandidate[] = [];
  for (const worker of workers) {
    if (
      worker.availableFrom === undefined ||
      worker.availableFrom > request.desiredStartDate
    ) {
      continue;
    }
    const matched = required.filter((id) => worker.skillIds.includes(id));
    if (required.length === 0 || matched.length * 2 < required.length) {
      continue;
    }
    candidates.push({
      worker,
      matchedSkillIds: matched,
      missingSkillIds: required.filter((id) => !matched.includes(id)),
    });
  }
  return candidates.sort(compareCandidates);
}

export function fillShortlist(
  request: TaskRequest,
  state: DemoState,
  context: CommandContext,
): DemoState {
  if (!matchableStatuses.includes(request.status)) {
    return state;
  }
  const business = state.frame.businesses.find(
    (item) => item.id === request.businessId,
  );
  if (business === undefined) {
    return state;
  }
  const isFirst = request.shortlist.every((item) => item.state === "removed");
  const live = request.shortlist.filter((item) => item.state !== "removed");
  const slots = Math.max(maxShortlistSize - live.length, 0);
  const excluded = new Set(
    request.excludedWorkerIds.map((item) => item.workerId),
  );
  const taken = new Set(live.map((item) => item.workerId));
  const candidates = state.marketplace.workerProfiles.filter(
    (worker) =>
      isEligibleForMatching(worker, state) &&
      !excluded.has(worker.personId) &&
      !taken.has(worker.personId),
  );
  const ranked = rankCandidates(request, candidates).slice(0, slots);

  let nextRank = Math.max(0, ...request.shortlist.map((item) => item.rank)) + 1;
  const newEntries: ShortlistEntry[] = [];
  const newLog: LogEvent[] = [];
  const newConversations = [...state.marketplace.conversations];
  for (const candidate of ranked) {
    const workerId = candidate.worker.personId;
    const hasConversation = newConversations.some(
      (item) => item.requestId === request.id && item.workerId === workerId,
    );
    if (!hasConversation) {
      newConversations.push({
        id: context.newId(),
        requestId: request.id,
        ownerId: business.ownerId,
        workerId,
        messages: [],
      });
    }
    newEntries.push({
      workerId,
      rank: nextRank,
      addedAt: context.now,
      matchedSkillIds: candidate.matchedSkillIds,
      missingSkillIds: candidate.missingSkillIds,
      state: "active",
    });
    nextRank += 1;
    newLog.push(shortlistedLog(state, context, "system", workerId));
  }

  const shortlist = [...request.shortlist, ...newEntries];
  const activeCount = shortlist.filter(
    (item) => item.state === "active",
  ).length;
  let status = request.status;
  if (status === "open" && activeCount >= 1) {
    status = "shortlisted";
  } else if (status === "shortlisted" && activeCount === 0) {
    status = "open";
  }
  if (status !== request.status) {
    newLog.push(statusChangedLog(context, "system", request.status, status));
  }

  const updated = appendLog({ ...request, shortlist, status }, newLog);
  const addedIds = newEntries.map((item) => item.workerId);
  const profiles = state.marketplace.workerProfiles.map((worker) =>
    addedIds.includes(worker.personId)
      ? { ...worker, lastShortlistedAt: context.now }
      : worker,
  );
  let next: DemoState = replaceRequest(
    {
      ...state,
      marketplace: {
        ...state.marketplace,
        workerProfiles: profiles,
        conversations: newConversations,
      },
    },
    updated,
  );
  if (newEntries.length > 0) {
    next = addActivity(next, [
      shortlistActivity(
        next,
        context,
        updated,
        addedIds,
        live.length + newEntries.length,
        isFirst,
      ),
    ]);
  }
  return next;
}

export function fillRequests(
  requestIds: Id[],
  state: DemoState,
  context: CommandContext,
): DemoState {
  const ordered = state.marketplace.requests
    .filter((item) => requestIds.includes(item.id))
    .sort(byCreatedAt);
  let current = state;
  for (const original of ordered) {
    const latest = current.marketplace.requests.find(
      (item) => item.id === original.id,
    );
    if (latest !== undefined) {
      current = fillShortlist(latest, current, context);
    }
  }
  return current;
}

export function fillRequestsWithRoom(
  state: DemoState,
  context: CommandContext,
): DemoState {
  const ids = state.marketplace.requests
    .filter(
      (item) =>
        matchableStatuses.includes(item.status) &&
        item.shortlist.filter((entry) => entry.state !== "removed").length <
          maxShortlistSize,
    )
    .map((item) => item.id);
  return fillRequests(ids, state, context);
}
