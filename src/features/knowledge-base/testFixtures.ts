import type { DemoState } from "../../domain/frame/types";
import {
  answer,
  flag,
  kbState,
  people,
  question,
  review,
} from "../../domain/knowledge-base/testState";

export const flagTimes = {
  questionSpam: "2026-11-11T09:00:00+01:00",
  answerOutdated: "2026-11-10T09:00:00+01:00",
  answerIncorrect: "2026-11-10T11:30:00+01:00",
  otherAnswer: "2026-11-12T10:00:00+01:00",
};

export function moderationState(): DemoState {
  return kbState({
    questions: [
      question("sporsmal-1", { moderation: "flagged" }),
      question("sporsmal-2", {
        title: "Hvordan får vi flere nyhetsbrevabonnenter?",
        description: "Vi sender ut ett brev i måneden og vil nå flere.",
        authorId: people.kari,
        businessId: "bedrift-1",
        createdAt: "2026-11-09T09:00:00+01:00",
      }),
    ],
    answers: [
      answer("svar-1", "sporsmal-1"),
      answer("svar-2", "sporsmal-1", {
        authorId: people.ola,
        businessId: "bedrift-4",
        text: "Bruk en fast pris for hele landet.",
        createdAt: "2026-11-10T11:00:00+01:00",
        moderation: "flagged",
      }),
      answer("svar-3", "sporsmal-1", {
        authorId: people.kari,
        businessId: "bedrift-1",
        text: "Fjernet svar",
        createdAt: "2026-11-10T12:00:00+01:00",
        moderation: "removed",
      }),
      answer("svar-4", "sporsmal-2", {
        text: "Gi bort en gratis guide mot påmelding.",
        createdAt: "2026-11-10T13:00:00+01:00",
        moderation: "flagged",
      }),
    ],
    flags: [
      flag("flagg-1", "vurdering-1", "question", "sporsmal-1", {
        flaggedBy: people.per,
        reason: "spam",
        note: "Dette er reklame.",
        at: flagTimes.questionSpam,
      }),
      flag("flagg-2", "vurdering-2", "answer", "svar-2", {
        flaggedBy: people.kari,
        reason: "outdated",
        at: flagTimes.answerOutdated,
      }),
      flag("flagg-3", "vurdering-2", "answer", "svar-2", {
        flaggedBy: people.jonas,
        reason: "incorrect",
        note: "Prisen er feil.",
        at: flagTimes.answerIncorrect,
      }),
      flag("flagg-4", "vurdering-3", "answer", "svar-4", {
        flaggedBy: people.ola,
        reason: "incorrect",
        at: flagTimes.otherAnswer,
      }),
    ],
    reviews: [
      review("vurdering-1", "question", "sporsmal-1", ["flagg-1"], {
        openedAt: flagTimes.questionSpam,
      }),
      review("vurdering-2", "answer", "svar-2", ["flagg-2", "flagg-3"], {
        openedAt: flagTimes.answerOutdated,
      }),
      review("vurdering-3", "answer", "svar-4", ["flagg-4"], {
        openedAt: flagTimes.otherAnswer,
      }),
    ],
  });
}
