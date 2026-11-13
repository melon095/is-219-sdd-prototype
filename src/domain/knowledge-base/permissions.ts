import { isAdmin, peopleWorkingAt } from "../frame/people";
import type { Business, DemoState, Person } from "../frame/types";
import { findTarget, openReviewFor } from "./helpers";
import type { Answer, ContentTarget, Question } from "./types";

export function memberBusinessOf(
  person: Person,
  state: DemoState,
): Business | undefined {
  return state.frame.businesses.find(
    (business) =>
      business.isEWavesMember &&
      peopleWorkingAt(business, state).some(
        (worker) => worker.id === person.id,
      ),
  );
}

export function isMember(person: Person, state: DemoState): boolean {
  return memberBusinessOf(person, state) !== undefined;
}

export function canView(person: Person, state: DemoState): boolean {
  return isAdmin(person) || isMember(person, state);
}

export function canPost(person: Person, state: DemoState): boolean {
  return !isAdmin(person) && isMember(person, state);
}

export function canEditQuestion(person: Person, question: Question): boolean {
  return (
    !isAdmin(person) &&
    question.authorId === person.id &&
    question.moderation !== "removed"
  );
}

export function canEditAnswer(person: Person, answer: Answer): boolean {
  return (
    !isAdmin(person) &&
    answer.authorId === person.id &&
    answer.moderation !== "removed"
  );
}

export function hasFlagged(
  person: Person,
  target: ContentTarget,
  state: DemoState,
): boolean {
  const review = openReviewFor(state, target);
  return (
    review !== undefined &&
    state.knowledgeBase.flags.some(
      (flag) =>
        review.flagIds.includes(flag.id) && flag.flaggedBy === person.id,
    )
  );
}

export function canFlag(
  person: Person,
  target: ContentTarget,
  state: DemoState,
): boolean {
  if (!canPost(person, state)) {
    return false;
  }
  const item = findTarget(state, target);
  if (
    item === undefined ||
    item.moderation === "removed" ||
    item.authorId === person.id
  ) {
    return false;
  }
  return !hasFlagged(person, target, state);
}

export function canReview(person: Person): boolean {
  return isAdmin(person);
}

export function canSeeFlaggers(person: Person): boolean {
  return isAdmin(person);
}
