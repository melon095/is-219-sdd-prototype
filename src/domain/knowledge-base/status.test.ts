import { describe, expect, it } from "vitest";
import { questionStatus, visibleAnswers, visibleQuestions } from "./status";
import { answer, kbState, question } from "./testState";
import type { Moderation } from "./types";

function withAnswers(...moderations: Moderation[]) {
  const q = question("sporsmal-1");
  const answers = moderations.map((moderation, index) =>
    answer(`svar-${index + 1}`, "sporsmal-1", { moderation }),
  );
  return { q, state: kbState({ questions: [q], answers }) };
}

describe("questionStatus", () => {
  it("er åpent uten svar", () => {
    const { q, state } = withAnswers();
    expect(questionStatus(q, state)).toBe("open");
  });

  it("er besvart når minst ett svar er current", () => {
    const { q, state } = withAnswers("current");
    expect(questionStatus(q, state)).toBe("answered");
  });

  it("er besvart når minst ett svar er cleared", () => {
    const { q, state } = withAnswers("cleared");
    expect(questionStatus(q, state)).toBe("answered");
  });

  it("er besvart når ett svar er flagget og et annet er gyldig", () => {
    const { q, state } = withAnswers("flagged", "current");
    expect(questionStatus(q, state)).toBe("answered");
  });

  it("er åpent når alle svar er flagget", () => {
    const { q, state } = withAnswers("flagged", "flagged");
    expect(questionStatus(q, state)).toBe("open");
  });

  it("er åpent når alle svar er fjernet", () => {
    const { q, state } = withAnswers("removed", "removed");
    expect(questionStatus(q, state)).toBe("open");
  });

  it("er åpent når svarene er en blanding av flagget og fjernet", () => {
    const { q, state } = withAnswers("flagged", "removed");
    expect(questionStatus(q, state)).toBe("open");
  });

  it("ser bare på svarene til dette spørsmålet", () => {
    const q1 = question("sporsmal-1");
    const q2 = question("sporsmal-2");
    const state = kbState({
      questions: [q1, q2],
      answers: [answer("svar-1", "sporsmal-2")],
    });
    expect(questionStatus(q1, state)).toBe("open");
    expect(questionStatus(q2, state)).toBe("answered");
  });
});

describe("visibleQuestions", () => {
  it("gir alle spørsmål som ikke er fjernet", () => {
    const state = kbState({
      questions: [
        question("sporsmal-1"),
        question("sporsmal-2", { moderation: "flagged" }),
        question("sporsmal-3", { moderation: "cleared" }),
        question("sporsmal-4", { moderation: "removed" }),
      ],
    });
    expect(visibleQuestions(state).map((item) => item.id)).toEqual([
      "sporsmal-1",
      "sporsmal-2",
      "sporsmal-3",
    ]);
  });
});

describe("visibleAnswers", () => {
  it("gir svar som ikke er fjernet, eldste først", () => {
    const state = kbState({
      questions: [question("sporsmal-1"), question("sporsmal-2")],
      answers: [
        answer("svar-1", "sporsmal-1", {
          createdAt: "2026-11-12T09:00:00+01:00",
        }),
        answer("svar-2", "sporsmal-1", {
          createdAt: "2026-11-10T09:00:00+01:00",
        }),
        answer("svar-3", "sporsmal-1", {
          createdAt: "2026-11-11T09:00:00+01:00",
          moderation: "removed",
        }),
        answer("svar-4", "sporsmal-1", {
          createdAt: "2026-11-11T12:00:00+01:00",
          moderation: "flagged",
        }),
        answer("svar-5", "sporsmal-2"),
      ],
    });
    expect(visibleAnswers("sporsmal-1", state).map((item) => item.id)).toEqual([
      "svar-2",
      "svar-4",
      "svar-1",
    ]);
  });

  it("gir en tom liste for et ukjent spørsmål", () => {
    expect(visibleAnswers("finnes-ikke", kbState({}))).toEqual([]);
  });
});
