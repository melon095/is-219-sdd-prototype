import {
  actorOf,
  addActivity,
  fail,
  readText,
  succeed,
  validationFailure,
} from "../frame/commandHelpers";
import type {
  ActivityEntry,
  CommandContext,
  CommandHandler,
  DemoState,
  Id,
} from "../frame/types";
import { contentFlaggedActivity, reviewFinishedActivity } from "./activity";
import {
  findTarget,
  flagsOfReview,
  openReviewFor,
  threadQuestion,
} from "./helpers";
import { canFlag, canPost, canReview } from "./permissions";
import type {
  Flag,
  FlagContentInput,
  FlagReason,
  Review,
  ReviewContentInput,
  ReviewOutcome,
} from "./types";

const reasons: FlagReason[] = [
  "outdated",
  "incorrect",
  "spam",
  "off-topic",
  "other",
];

const noteError = "Fortell kort hva som er galt";

export const flagContent: CommandHandler = (state, command, context) => {
  const input = command as unknown as FlagContentInput;
  const actor = actorOf(state, context);
  if (!canPost(actor, state)) {
    return fail(
      "not-allowed",
      "Bare medlemmer i E-Waves kan flagge innlegg i kunnskapsbanken.",
    );
  }
  const target = { targetKind: input.targetKind, targetId: input.targetId };
  const item = findTarget(state, target);
  if (item === undefined || item.moderation === "removed") {
    return fail("not-found", "Vi finner ikke innlegget.");
  }
  if (!canFlag(actor, target, state)) {
    return fail("not-allowed", "Du kan ikke flagge dette innlegget.");
  }
  const errors: Record<string, string> = {};
  if (!reasons.includes(input.reason)) {
    errors.reason = "Velg hva som er galt";
  }
  const note = readText(input.note);
  if (note.length > 500 || (input.reason === "other" && note.length === 0)) {
    errors.note = noteError;
  }
  if (Object.keys(errors).length > 0) {
    return validationFailure(errors);
  }
  const question = threadQuestion(state, item);
  if (question === undefined) {
    return fail("not-found", "Vi finner ikke spørsmålet.");
  }
  const existing = openReviewFor(state, target);
  const reviewId = existing === undefined ? context.newId() : existing.id;
  const flag: Flag = {
    id: context.newId(),
    reviewId,
    targetKind: input.targetKind,
    targetId: input.targetId,
    flaggedBy: actor.id,
    reason: input.reason,
    ...(note.length > 0 ? { note } : {}),
    at: context.now,
  };
  const reviews: Review[] =
    existing === undefined
      ? [
          ...state.knowledgeBase.reviews,
          {
            id: reviewId,
            targetKind: input.targetKind,
            targetId: input.targetId,
            openedAt: context.now,
            flagIds: [flag.id],
          },
        ]
      : state.knowledgeBase.reviews.map((review) =>
          review.id === existing.id
            ? { ...review, flagIds: [...review.flagIds, flag.id] }
            : review,
        );
  const next: DemoState = {
    ...state,
    knowledgeBase: {
      ...state.knowledgeBase,
      flags: [...state.knowledgeBase.flags, flag],
      reviews,
      questions:
        input.targetKind === "question" && existing === undefined
          ? state.knowledgeBase.questions.map((candidate) =>
              candidate.id === item.id
                ? { ...candidate, moderation: "flagged" }
                : candidate,
            )
          : state.knowledgeBase.questions,
      answers:
        input.targetKind === "answer" && existing === undefined
          ? state.knowledgeBase.answers.map((candidate) =>
              candidate.id === item.id
                ? { ...candidate, moderation: "flagged" }
                : candidate,
            )
          : state.knowledgeBase.answers,
    },
  };
  return succeed(
    addActivity(next, [
      contentFlaggedActivity(question, item.authorId, actor.id, context),
    ]),
    [{ kind: "info", message: "Takk! Varodd ser på det du har flagget." }],
  );
};

function flaggersOf(state: DemoState, review: Review): Id[] {
  return flagsOfReview(state, review).map((flag) => flag.flaggedBy);
}

function closeReview(
  review: Review,
  outcome: ReviewOutcome,
  context: CommandContext,
): Review {
  return {
    ...review,
    outcome,
    reviewedBy: context.actorId,
    reviewedAt: context.now,
  };
}

function finishedEntry(
  state: DemoState,
  review: Review,
  outcome: ReviewOutcome,
  context: CommandContext,
): ActivityEntry | undefined {
  const item = findTarget(state, review);
  if (item === undefined) {
    return undefined;
  }
  const question = threadQuestion(state, item);
  if (question === undefined) {
    return undefined;
  }
  return reviewFinishedActivity(
    question,
    outcome,
    item.authorId,
    flaggersOf(state, review),
    context,
  );
}

export const reviewContent: CommandHandler = (state, command, context) => {
  const input = command as unknown as ReviewContentInput;
  if (!canReview(actorOf(state, context))) {
    return fail(
      "not-allowed",
      "Bare Varodd-ansatte kan vurdere flagget innhold.",
    );
  }
  const review = state.knowledgeBase.reviews.find(
    (item) => item.id === input.reviewId,
  );
  if (review === undefined) {
    return fail("not-found", "Vi finner ikke vurderingen.");
  }
  if (review.outcome !== undefined) {
    return fail("invalid-status", "Denne vurderingen er allerede avsluttet.");
  }
  if (input.decision !== "clear" && input.decision !== "remove") {
    return validationFailure({ decision: "Velg Behold eller Fjern" });
  }
  const item = findTarget(state, review);
  if (item === undefined) {
    return fail("not-found", "Vi finner ikke innlegget.");
  }
  const outcome: ReviewOutcome =
    input.decision === "clear" ? "cleared" : "removed";
  const moderation = outcome === "cleared" ? "cleared" : "removed";
  const removesThread =
    outcome === "removed" && review.targetKind === "question";
  const threadAnswerIds = new Set(
    removesThread
      ? state.knowledgeBase.answers
          .filter((answer) => answer.questionId === item.id)
          .map((answer) => answer.id)
      : [],
  );
  const closing: Review[] = [
    review,
    ...(removesThread
      ? state.knowledgeBase.reviews.filter(
          (other) =>
            other.id !== review.id &&
            other.outcome === undefined &&
            ((other.targetKind === "question" && other.targetId === item.id) ||
              (other.targetKind === "answer" &&
                threadAnswerIds.has(other.targetId))),
        )
      : []),
  ];
  const closingIds = new Set(closing.map((other) => other.id));
  const entries = closing.flatMap((other) => {
    const entry = finishedEntry(state, other, outcome, context);
    return entry === undefined ? [] : [entry];
  });
  const next: DemoState = {
    ...state,
    knowledgeBase: {
      ...state.knowledgeBase,
      reviews: state.knowledgeBase.reviews.map((other) =>
        closingIds.has(other.id) ? closeReview(other, outcome, context) : other,
      ),
      questions: state.knowledgeBase.questions.map((question) =>
        review.targetKind === "question" && question.id === item.id
          ? { ...question, moderation }
          : question,
      ),
      answers: state.knowledgeBase.answers.map((answer) => {
        if (review.targetKind === "answer" && answer.id === item.id) {
          return { ...answer, moderation };
        }
        return threadAnswerIds.has(answer.id)
          ? { ...answer, moderation: "removed" }
          : answer;
      }),
    },
  };
  return succeed(addActivity(next, entries));
};

export function openReviews(state: DemoState): Review[] {
  return state.knowledgeBase.reviews
    .filter((review) => review.outcome === undefined)
    .sort((a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt));
}

export function closedReviews(state: DemoState): Review[] {
  return state.knowledgeBase.reviews
    .filter((review) => review.outcome !== undefined)
    .sort(
      (a, b) =>
        Date.parse(b.reviewedAt ?? b.openedAt) -
        Date.parse(a.reviewedAt ?? a.openedAt),
    );
}
