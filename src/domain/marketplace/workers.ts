import {
  actorOf,
  addActivity,
  failWith,
  isValidDate,
  readText,
  succeed,
  validationFailure,
} from "../frame/commandHelpers";
import { workerProfileOf } from "../frame/people";
import type {
  CommandContext,
  CommandHandler,
  DemoState,
  Id,
} from "../frame/types";
import { navReferralActivity, profileReadyActivity } from "./log";
import { fillRequestsWithRoom, isEligibleForMatching } from "./matching";
import {
  navReferralBlocker,
  registerBlocker,
  updateProfileBlocker,
} from "./permissions";
import type {
  ExperienceLevel,
  RegisterWorkerProfileInput,
  SimulateNavReferralInput,
  WorkerProfile,
} from "./types";

const experienceLevels: ExperienceLevel[] = ["junior", "mid", "senior"];

type FieldsResult =
  | {
      fields: Pick<
        WorkerProfile,
        "skillIds" | "experienceLevel" | "availableFrom" | "wishes"
      >;
      errors: undefined;
    }
  | { fields: undefined; errors: Record<string, string> };

function readFields(
  input: Record<string, unknown>,
  state: DemoState,
): FieldsResult {
  const errors: Record<string, string> = {};

  const knownSkills = new Set(state.frame.skills.map((skill) => skill.id));
  const rawSkills = Array.isArray(input.skillIds) ? input.skillIds : [];
  const skillIds = [
    ...new Set(rawSkills.filter((id): id is string => typeof id === "string")),
  ];
  if (skillIds.length < 1) {
    errors.skillIds = "Velg minst én ferdighet.";
  } else if (skillIds.some((id) => !knownSkills.has(id))) {
    errors.skillIds = "Vi kjenner ikke igjen en av ferdighetene.";
  }

  const level = input.experienceLevel;
  if (!experienceLevels.some((item) => item === level)) {
    errors.experienceLevel = "Velg erfaringsnivå.";
  }

  const availableFrom = input.availableFrom;
  if (!isValidDate(availableFrom)) {
    errors.availableFrom = "Velg når du kan starte.";
  }

  if (
    Object.keys(errors).length > 0 ||
    !experienceLevels.some((item) => item === level) ||
    typeof availableFrom !== "string"
  ) {
    return { fields: undefined, errors };
  }

  const wishes = readText(input.wishes);
  const fields: Pick<
    WorkerProfile,
    "skillIds" | "experienceLevel" | "availableFrom" | "wishes"
  > = {
    skillIds,
    experienceLevel: level as ExperienceLevel,
    availableFrom,
  };
  if (wishes.length > 0) {
    fields.wishes = wishes;
  }
  return { fields, errors: undefined };
}

function saveProfile(
  state: DemoState,
  command: Record<string, unknown>,
  context: CommandContext,
  announceReady: boolean,
): DemoState | { errors: Record<string, string> } {
  const parsed = readFields(command, state);
  if (parsed.fields === undefined) {
    return { errors: parsed.errors };
  }
  const existing = workerProfileOf(context.actorId, state);
  const profile: WorkerProfile = {
    personId: context.actorId,
    skillIds: parsed.fields.skillIds,
    experienceLevel: parsed.fields.experienceLevel,
    availableFrom: parsed.fields.availableFrom,
    isDraft: false,
  };
  if (parsed.fields.wishes !== undefined) {
    profile.wishes = parsed.fields.wishes;
  }
  if (existing?.navReferral !== undefined) {
    profile.navReferral = existing.navReferral;
  }
  profile.eligibleSince = existing?.eligibleSince ?? context.now;
  if (existing?.lastShortlistedAt !== undefined) {
    profile.lastShortlistedAt = existing.lastShortlistedAt;
  }
  const profiles =
    existing === undefined
      ? [...state.marketplace.workerProfiles, profile]
      : state.marketplace.workerProfiles.map((item) =>
          item.personId === profile.personId ? profile : item,
        );
  let next: DemoState = {
    ...state,
    marketplace: { ...state.marketplace, workerProfiles: profiles },
  };
  if (announceReady) {
    next = addActivity(next, [profileReadyActivity(context, context.actorId)]);
  }
  if (isEligibleForMatching(profile, next)) {
    next = fillRequestsWithRoom(next, context);
  }
  return next;
}

function saved(
  result: DemoState | { errors: Record<string, string> },
): ReturnType<CommandHandler> {
  return "errors" in result
    ? validationFailure(result.errors)
    : succeed(result);
}

export const registerWorkerProfile: CommandHandler = (
  state,
  command,
  context,
) => {
  const input = command as unknown as RegisterWorkerProfileInput;
  const blocker = registerBlocker(actorOf(state, context), state);
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  return saved(saveProfile(state, { ...input }, context, true));
};

export const updateWorkerProfile: CommandHandler = (
  state,
  command,
  context,
) => {
  const blocker = updateProfileBlocker(actorOf(state, context), state);
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  return saved(saveProfile(state, command, context, false));
};

export const simulateNavReferral: CommandHandler = (
  state,
  command,
  context,
) => {
  const input = command as unknown as SimulateNavReferralInput;
  const personId: Id = input.personId;
  const blocker = navReferralBlocker(actorOf(state, context), personId, state);
  if (blocker !== undefined) {
    return failWith(blocker);
  }
  const draft: WorkerProfile = {
    personId,
    skillIds: [],
    isDraft: true,
    navReferral: { referredAt: context.now, simulated: true },
  };
  const next = addActivity(
    {
      ...state,
      marketplace: {
        ...state.marketplace,
        workerProfiles: [...state.marketplace.workerProfiles, draft],
      },
    },
    [navReferralActivity(context, context.actorId, personId)],
  );
  return succeed(next);
};
