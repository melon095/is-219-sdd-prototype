import { describe, expect, it } from "vitest";
import type { CommandResult, DemoState } from "../frame/types";
import { editQuestion, postQuestion } from "./questions";
import { questionStatus } from "./status";
import { context, kbState, people, question } from "./testState";

const validInput = {
  type: "postQuestion",
  topicId: "tema-1",
  title: "Hvordan setter jeg opp frakt?",
  description: "Vi trenger en enkel løsning for frakt til hele landet.",
};

function post(
  overrides: Record<string, unknown> = {},
  actorId: string = people.jonas,
  state: DemoState = kbState({}),
): CommandResult {
  return postQuestion(
    state,
    { ...validInput, ...overrides },
    context(actorId, "2026-11-16T10:00:00+01:00", "ny"),
  );
}

function edit(
  overrides: Record<string, unknown>,
  actorId: string,
  state: DemoState,
): CommandResult {
  return editQuestion(
    state,
    {
      type: "editQuestion",
      questionId: "sporsmal-1",
      topicId: "tema-2",
      title: "Ny tittel",
      description: "Ny beskrivelse.",
      ...overrides,
    },
    context(actorId, "2026-11-17T09:00:00+01:00", "ny"),
  );
}

function fieldErrorsOf(result: CommandResult): Record<string, string> {
  if (result.ok) {
    throw new Error("Forventet en feil");
  }
  expect(result.error.code).toBe("validation");
  return result.error.fieldErrors ?? {};
}

function codeOf(result: CommandResult): string {
  if (result.ok) {
    throw new Error("Forventet en feil");
  }
  return result.error.code;
}

function stateOf(result: CommandResult): DemoState {
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.state;
}

describe("postQuestion permissions", () => {
  it("lets members who are not administrators post", () => {
    for (const actor of [people.kari, people.jonas, people.per, people.ola]) {
      expect(post({}, actor).ok).toBe(true);
    }
  });

  it("refuses non-members and administrators", () => {
    expect(codeOf(post({}, people.anne))).toBe("not-allowed");
    expect(codeOf(post({}, people.marte))).toBe("not-allowed");
  });

  it("changes nothing when it fails", () => {
    const state = kbState({});
    const activityBefore = state.frame.activity;
    const result = post({}, people.anne, state);
    expect(result.ok).toBe(false);
    expect(state.knowledgeBase.questions).toEqual([]);
    expect(state.frame.activity).toBe(activityBefore);
  });
});

describe("postQuestion validation", () => {
  it("rejects an unknown topic", () => {
    expect(fieldErrorsOf(post({ topicId: "tema-99" })).topicId).toBeTruthy();
  });

  it("rejects a title outside 1–120 characters after trimming", () => {
    expect(fieldErrorsOf(post({ title: "" })).title).toBe(
      "Skriv en tittel på opptil 120 tegn",
    );
    expect(fieldErrorsOf(post({ title: "    " })).title).toBeTruthy();
    expect(fieldErrorsOf(post({ title: "a".repeat(121) })).title).toBeTruthy();
    expect(post({ title: "a".repeat(120) }).ok).toBe(true);
    expect(post({ title: `  ${"a".repeat(120)}  ` }).ok).toBe(true);
  });

  it("rejects a description outside 1–4000 characters after trimming", () => {
    expect(fieldErrorsOf(post({ description: "" })).description).toBe(
      "Beskriv spørsmålet med opptil 4000 tegn",
    );
    expect(fieldErrorsOf(post({ description: "  " })).description).toBeTruthy();
    expect(
      fieldErrorsOf(post({ description: "a".repeat(4001) })).description,
    ).toBeTruthy();
    expect(post({ description: "a".repeat(4000) }).ok).toBe(true);
  });

  it("reports every broken field at once", () => {
    const errors = fieldErrorsOf(
      post({ topicId: "tema-99", title: "", description: "" }),
    );
    expect(Object.keys(errors).sort()).toEqual([
      "description",
      "title",
      "topicId",
    ]);
  });

  it("treats non-text input as empty", () => {
    expect(fieldErrorsOf(post({ title: 5 })).title).toBeTruthy();
  });
});

describe("postQuestion effects", () => {
  it("stores a trimmed open question with the author and the member business", () => {
    const result = post({
      title: "  Hvordan setter jeg opp frakt?  ",
      description: "  Vi trenger frakt.  ",
    });
    const state = stateOf(result);
    expect(state.knowledgeBase.questions).toEqual([
      {
        id: "ny-1",
        topicId: "tema-1",
        title: "Hvordan setter jeg opp frakt?",
        description: "Vi trenger frakt.",
        authorId: people.jonas,
        businessId: "bedrift-1",
        createdAt: "2026-11-16T10:00:00+01:00",
        moderation: "current",
      },
    ]);
    const [stored] = state.knowledgeBase.questions;
    if (stored === undefined) {
      throw new Error("Mangler spørsmål");
    }
    expect(questionStatus(stored, state)).toBe("open");
  });

  it("uses the business of the acting person", () => {
    const state = stateOf(post({}, people.per));
    expect(state.knowledgeBase.questions[0]?.businessId).toBe("bedrift-2");
  });

  it("adds the posted activity for every member", () => {
    const before = kbState({});
    const state = stateOf(post({}, people.jonas, before));
    const entries = state.frame.activity.slice(before.frame.activity.length);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      id: "ny-2",
      at: "2026-11-16T10:00:00+01:00",
      featureId: "knowledgeBase",
      actor: people.jonas,
      text: "Nytt spørsmål: «Hvordan setter jeg opp frakt?»",
      target: { route: "/kunnskapsbank/sporsmal/ny-1" },
      audience: {
        personIds: [],
        groups: ["knowledgeBase.members"],
        requiredGroup: "knowledgeBase.members",
      },
    });
  });

  it("returns no notices and leaves the old state untouched", () => {
    const before = kbState({});
    const result = post({}, people.jonas, before);
    expect(result.ok && result.notices).toEqual([]);
    expect(before.knowledgeBase.questions).toEqual([]);
  });
});

describe("editQuestion", () => {
  const original = question("sporsmal-1", { authorId: people.jonas });

  function stateWithQuestion(overrides = {}): DemoState {
    return kbState({
      questions: [{ ...original, ...overrides }],
    });
  }

  it("lets the author replace topic, title, and description", () => {
    const state = stateOf(edit({}, people.jonas, stateWithQuestion()));
    expect(state.knowledgeBase.questions).toEqual([
      {
        ...original,
        topicId: "tema-2",
        title: "Ny tittel",
        description: "Ny beskrivelse.",
        editedAt: "2026-11-17T09:00:00+01:00",
      },
    ]);
  });

  it("keeps the moderation, also when flagged", () => {
    const state = stateOf(
      edit({}, people.jonas, stateWithQuestion({ moderation: "flagged" })),
    );
    expect(state.knowledgeBase.questions[0]?.moderation).toBe("flagged");
  });

  it("adds no activity", () => {
    const before = stateWithQuestion();
    const state = stateOf(edit({}, people.jonas, before));
    expect(state.frame.activity).toEqual(before.frame.activity);
  });

  it("refuses everyone but the author", () => {
    for (const actor of [people.kari, people.per, people.anne, people.marte]) {
      expect(codeOf(edit({}, actor, stateWithQuestion()))).toBe("not-allowed");
    }
  });

  it("gives not-found for a removed or unknown question", () => {
    expect(
      codeOf(
        edit({}, people.jonas, stateWithQuestion({ moderation: "removed" })),
      ),
    ).toBe("not-found");
    expect(
      codeOf(edit({ questionId: "sporsmal-99" }, people.jonas, kbState({}))),
    ).toBe("not-found");
  });

  it("validates like postQuestion", () => {
    const state = stateWithQuestion();
    expect(
      fieldErrorsOf(edit({ title: "" }, people.jonas, state)).title,
    ).toBeTruthy();
    expect(
      fieldErrorsOf(edit({ description: "" }, people.jonas, state)).description,
    ).toBeTruthy();
    expect(
      fieldErrorsOf(edit({ topicId: "tema-99" }, people.jonas, state)).topicId,
    ).toBeTruthy();
  });
});
