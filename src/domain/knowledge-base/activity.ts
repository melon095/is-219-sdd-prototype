import type {
  ActivityEntry,
  Audience,
  CommandContext,
  Id,
} from "../frame/types";
import type { Question, ReviewOutcome } from "./types";

export const membersGroup = "knowledgeBase.members";

function entry(
  question: Question,
  text: string,
  audience: Omit<Audience, "requiredGroup">,
  context: CommandContext,
): ActivityEntry {
  return {
    id: context.newId(),
    at: context.now,
    featureId: "knowledgeBase",
    actor: context.actorId,
    text,
    target: { route: `/kunnskapsbank/sporsmal/${question.id}` },
    audience: { ...audience, requiredGroup: membersGroup },
  };
}

function distinct(ids: Id[]): Id[] {
  return [...new Set(ids)];
}

export function questionPostedActivity(
  question: Question,
  context: CommandContext,
): ActivityEntry {
  return entry(
    question,
    `Nytt spørsmål: «${question.title}»`,
    { personIds: [], groups: [membersGroup] },
    context,
  );
}

export function answerPostedActivity(
  question: Question,
  businessName: string,
  context: CommandContext,
): ActivityEntry {
  return entry(
    question,
    `${businessName} svarte på «${question.title}»`,
    { personIds: [], groups: [membersGroup] },
    context,
  );
}

export function contentFlaggedActivity(
  question: Question,
  authorId: Id,
  flaggerId: Id,
  context: CommandContext,
): ActivityEntry {
  return entry(
    question,
    `Et innlegg i «${question.title}» er flagget og venter på vurdering`,
    { personIds: distinct([authorId, flaggerId]), groups: [] },
    context,
  );
}

export function reviewFinishedActivity(
  question: Question,
  outcome: ReviewOutcome,
  authorId: Id,
  flaggerIds: Id[],
  context: CommandContext,
): ActivityEntry {
  const result = outcome === "cleared" ? "det er beholdt" : "det er fjernet";
  return entry(
    question,
    `Varodd har vurdert et flagget innlegg i «${question.title}»: ${result}`,
    { personIds: distinct([authorId, ...flaggerIds]), groups: [] },
    context,
  );
}
