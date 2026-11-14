import { describe, expect, it } from "vitest";
import { flagsOfReview, threadQuestion } from "./helpers";
import { answer, flag, kbState, people, question, review } from "./testState";

describe("flagsOfReview", () => {
  it("gir flaggene i vurderingen i rekkefølgen de ble lagt til", () => {
    const state = kbState({
      questions: [question("sporsmal-1")],
      answers: [answer("svar-1", "sporsmal-1")],
      flags: [
        flag("flagg-1", "vurdering-1", "answer", "svar-1"),
        flag("flagg-2", "vurdering-2", "answer", "svar-1"),
        flag("flagg-3", "vurdering-1", "answer", "svar-1", {
          flaggedBy: people.kari,
        }),
      ],
      reviews: [
        review("vurdering-1", "answer", "svar-1", ["flagg-1", "flagg-3"]),
      ],
    });
    const found = state.knowledgeBase.reviews[0];
    if (found === undefined) {
      throw new Error("Mangler vurdering");
    }

    expect(flagsOfReview(state, found).map((item) => item.id)).toEqual([
      "flagg-1",
      "flagg-3",
    ]);
  });
});

describe("threadQuestion", () => {
  const state = kbState({
    questions: [question("sporsmal-1")],
    answers: [answer("svar-1", "sporsmal-1")],
  });

  it("gir spørsmålet selv for et spørsmål og spørsmålet for et svar", () => {
    const [firstQuestion] = state.knowledgeBase.questions;
    const [firstAnswer] = state.knowledgeBase.answers;
    if (firstQuestion === undefined || firstAnswer === undefined) {
      throw new Error("Mangler data");
    }

    expect(threadQuestion(state, firstQuestion)?.id).toBe("sporsmal-1");
    expect(threadQuestion(state, firstAnswer)?.id).toBe("sporsmal-1");
  });

  it("gir ingenting når spørsmålet mangler", () => {
    const [firstAnswer] = state.knowledgeBase.answers;
    if (firstAnswer === undefined) {
      throw new Error("Mangler data");
    }

    expect(
      threadQuestion(
        { ...state, knowledgeBase: { ...state.knowledgeBase, questions: [] } },
        firstAnswer,
      ),
    ).toBe(undefined);
  });
});
