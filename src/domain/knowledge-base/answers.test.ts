import { describe, expect, it } from "vitest";
import { allAudienceGroups } from "../../app/features";
import { visibleActivity } from "../frame/activity";
import { personById } from "../frame/people";
import type { CommandResult, DemoState } from "../frame/types";
import { editAnswer, postAnswer } from "./answers";
import { questionStatus } from "./status";
import { answer, context, kbState, people, question } from "./testState";

function baseState(): DemoState {
  return kbState({
    questions: [
      question("sporsmal-1", { authorId: people.jonas }),
      question("sporsmal-2", { moderation: "removed" }),
    ],
  });
}

function reply(
  state: DemoState,
  actorId: string,
  text = "Bruk en fraktavtale med Posten.",
  questionId = "sporsmal-1",
  now = "2026-11-16T11:00:00+01:00",
): CommandResult {
  return postAnswer(
    state,
    { type: "postAnswer", questionId, text },
    context(actorId, now, "ny"),
  );
}

function stateOf(result: CommandResult): DemoState {
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.state;
}

function codeOf(result: CommandResult): string {
  if (result.ok) {
    throw new Error("Forventet en feil");
  }
  return result.error.code;
}

function fieldErrorsOf(result: CommandResult): Record<string, string> {
  if (result.ok) {
    throw new Error("Forventet en feil");
  }
  expect(result.error.code).toBe("validation");
  return result.error.fieldErrors ?? {};
}

describe("postAnswer permissions", () => {
  it("lets any member who is not an administrator answer", () => {
    for (const actor of [people.kari, people.jonas, people.per, people.ola]) {
      expect(reply(baseState(), actor).ok).toBe(true);
    }
  });

  it("lets the asker and the asker's colleague answer", () => {
    const asker = stateOf(reply(baseState(), people.jonas));
    expect(asker.knowledgeBase.answers[0]?.authorId).toBe(people.jonas);
    const colleague = stateOf(reply(baseState(), people.kari));
    expect(colleague.knowledgeBase.answers[0]).toMatchObject({
      authorId: people.kari,
      businessId: "bedrift-1",
    });
  });

  it("refuses non-members and administrators", () => {
    expect(codeOf(reply(baseState(), people.anne))).toBe("not-allowed");
    expect(codeOf(reply(baseState(), people.marte))).toBe("not-allowed");
  });
});

describe("postAnswer validation", () => {
  it("rejects text outside 1–4000 characters after trimming", () => {
    expect(fieldErrorsOf(reply(baseState(), people.per, "")).text).toBe(
      "Skriv et svar på opptil 4000 tegn",
    );
    expect(fieldErrorsOf(reply(baseState(), people.per, "   ")).text).toBe(
      "Skriv et svar på opptil 4000 tegn",
    );
    expect(
      fieldErrorsOf(reply(baseState(), people.per, "a".repeat(4001))).text,
    ).toBeTruthy();
    expect(reply(baseState(), people.per, "a".repeat(4000)).ok).toBe(true);
  });

  it("gives not-found for a removed or unknown question", () => {
    expect(codeOf(reply(baseState(), people.per, "Svar", "sporsmal-2"))).toBe(
      "not-found",
    );
    expect(codeOf(reply(baseState(), people.per, "Svar", "sporsmal-99"))).toBe(
      "not-found",
    );
  });
});

describe("postAnswer effects", () => {
  it("stores a trimmed answer attributed to the answering business", () => {
    const state = stateOf(reply(baseState(), people.per, "  Bruk Posten.  "));
    expect(state.knowledgeBase.answers).toEqual([
      {
        id: "ny-1",
        questionId: "sporsmal-1",
        text: "Bruk Posten.",
        authorId: people.per,
        businessId: "bedrift-2",
        createdAt: "2026-11-16T11:00:00+01:00",
        moderation: "current",
      },
    ]);
  });

  it("makes the question answered", () => {
    const before = baseState();
    const target = before.knowledgeBase.questions[0];
    if (target === undefined) {
      throw new Error("Mangler spørsmål");
    }
    expect(questionStatus(target, before)).toBe("open");
    const after = stateOf(reply(before, people.per));
    expect(questionStatus(target, after)).toBe("answered");
  });

  it("keeps the first answer when a second one arrives", () => {
    const first = stateOf(reply(baseState(), people.per, "Første svar"));
    const second = stateOf(
      postAnswer(
        first,
        { type: "postAnswer", questionId: "sporsmal-1", text: "Andre svar" },
        context(people.kari, "2026-11-16T12:00:00+01:00", "ny2"),
      ),
    );
    expect(second.knowledgeBase.answers.map((item) => item.text)).toEqual([
      "Første svar",
      "Andre svar",
    ]);
  });

  it("adds an activity entry naming the business that the asker can see", () => {
    const before = baseState();
    const state = stateOf(reply(before, people.per));
    const added = state.frame.activity.slice(before.frame.activity.length);
    expect(added).toHaveLength(1);
    expect(added[0]).toEqual({
      id: "ny-2",
      at: "2026-11-16T11:00:00+01:00",
      featureId: "knowledgeBase",
      actor: people.per,
      text: "Sørlandet Honning svarte på «Hvordan setter jeg opp frakt i nettbutikken?»",
      target: { route: "/kunnskapsbank/sporsmal/sporsmal-1" },
      audience: {
        personIds: [],
        groups: ["knowledgeBase.members"],
        requiredGroup: "knowledgeBase.members",
      },
    });
    const jonas = personById(people.jonas, state);
    const anne = personById(people.anne, state);
    if (jonas === undefined || anne === undefined) {
      throw new Error("Mangler person");
    }
    expect(
      visibleActivity(state, jonas, allAudienceGroups).some(
        (item) => item.id === "ny-2",
      ),
    ).toBe(true);
    expect(
      visibleActivity(state, anne, allAudienceGroups).some(
        (item) => item.id === "ny-2",
      ),
    ).toBe(false);
  });
});

describe("editAnswer", () => {
  function stateWithAnswer(overrides = {}): DemoState {
    return kbState({
      questions: [question("sporsmal-1")],
      answers: [
        answer("svar-1", "sporsmal-1", {
          authorId: people.per,
          businessId: "bedrift-2",
          ...overrides,
        }),
      ],
    });
  }

  function edit(
    state: DemoState,
    actorId: string,
    text = "Oppdatert svar.",
    answerId = "svar-1",
  ): CommandResult {
    return editAnswer(
      state,
      { type: "editAnswer", answerId, text },
      context(actorId, "2026-11-17T09:00:00+01:00", "ny"),
    );
  }

  it("lets the author replace the text and sets editedAt", () => {
    const state = stateOf(
      edit(stateWithAnswer(), people.per, "  Nytt svar.  "),
    );
    expect(state.knowledgeBase.answers[0]).toMatchObject({
      id: "svar-1",
      text: "Nytt svar.",
      editedAt: "2026-11-17T09:00:00+01:00",
      moderation: "current",
    });
  });

  it("keeps the moderation, also when flagged", () => {
    const state = stateOf(
      edit(stateWithAnswer({ moderation: "flagged" }), people.per),
    );
    expect(state.knowledgeBase.answers[0]?.moderation).toBe("flagged");
  });

  it("adds no activity", () => {
    const before = stateWithAnswer();
    expect(stateOf(edit(before, people.per)).frame.activity).toEqual(
      before.frame.activity,
    );
  });

  it("refuses everyone but the author", () => {
    for (const actor of [people.kari, people.ola, people.anne, people.marte]) {
      expect(codeOf(edit(stateWithAnswer(), actor))).toBe("not-allowed");
    }
  });

  it("gives not-found for a removed or unknown answer", () => {
    expect(
      codeOf(edit(stateWithAnswer({ moderation: "removed" }), people.per)),
    ).toBe("not-found");
    expect(
      codeOf(edit(stateWithAnswer(), people.per, "Tekst", "svar-99")),
    ).toBe("not-found");
  });

  it("validates the text like postAnswer", () => {
    expect(fieldErrorsOf(edit(stateWithAnswer(), people.per, "  ")).text).toBe(
      "Skriv et svar på opptil 4000 tegn",
    );
    expect(
      fieldErrorsOf(edit(stateWithAnswer(), people.per, "a".repeat(4001))).text,
    ).toBeTruthy();
  });
});
