import { describe, expect, it } from "vitest";
import type { DemoState } from "../frame/types";
import { chatbotResponse } from "./chatbot";
import { knowledgeBaseCommandHandlers } from "./commands";
import { searchQuestions } from "./search";
import {
  answer,
  context,
  flag,
  kbState,
  people,
  question,
  review,
} from "./testState";
import type { ChatbotQuestion } from "./types";

const answered: ChatbotQuestion = {
  id: "chatbot-1",
  text: "Hvordan sender jeg keramikk trygt?",
  answer: {
    text: "Pakk keramikk i bobleplast og en solid eske.",
    sourceQuestionIds: ["sporsmal-2", "sporsmal-1"],
    sourceAnswerIds: ["svar-1", "svar-2"],
  },
};

const unanswered: ChatbotQuestion = {
  id: "chatbot-2",
  text: "Hvordan lager jeg et abonnement på kaffe?",
};

function baseState(): DemoState {
  return kbState({
    questions: [
      question("sporsmal-1", {
        title: "Frakt av keramikk",
        description: "Hvordan sender vi keramikk?",
        createdAt: "2026-11-01T09:00:00+01:00",
      }),
      question("sporsmal-2", {
        title: "Pakking av glass",
        description: "Tips til emballasje.",
        createdAt: "2026-11-02T09:00:00+01:00",
      }),
      question("sporsmal-3", {
        title: "Kaffeabonnement i nettbutikken",
        description: "Vi vil ha abonnement på kaffe.",
        createdAt: "2026-11-03T09:00:00+01:00",
      }),
      question("sporsmal-4", {
        title: "Abonnement for kaffekunder",
        description: "Hvordan lager vi abonnement?",
        createdAt: "2026-11-04T09:00:00+01:00",
      }),
      question("sporsmal-5", {
        title: "Kaffe og abonnement fra nettbutikken",
        description: "Abonnement på kaffe hver måned.",
        createdAt: "2026-11-05T09:00:00+01:00",
      }),
      question("sporsmal-6", {
        title: "Abonnement på kaffe i butikken",
        description: "Kaffe og abonnement.",
        createdAt: "2026-11-06T09:00:00+01:00",
      }),
    ],
    answers: [
      answer("svar-1", "sporsmal-1", { text: "Bruk bobleplast." }),
      answer("svar-2", "sporsmal-2", { text: "Bruk en solid eske." }),
    ],
    chatbotQuestions: [answered, unanswered],
  });
}

function withModeration(
  state: DemoState,
  kind: "question" | "answer",
  id: string,
  moderation: "current" | "flagged" | "cleared" | "removed",
): DemoState {
  return {
    ...state,
    knowledgeBase: {
      ...state.knowledgeBase,
      questions:
        kind === "question"
          ? state.knowledgeBase.questions.map((item) =>
              item.id === id ? { ...item, moderation } : item,
            )
          : state.knowledgeBase.questions,
      answers:
        kind === "answer"
          ? state.knowledgeBase.answers.map((item) =>
              item.id === id ? { ...item, moderation } : item,
            )
          : state.knowledgeBase.answers,
    },
  };
}

function ids(questions: { id: string }[]): string[] {
  return questions.map((item) => item.id);
}

describe("chatbotResponse med et forberedt svar", () => {
  it("gir svaret med kildene i den rekkefølgen de er oppgitt", () => {
    const response = chatbotResponse(answered, baseState());

    expect(response.kind).toBe("answer");
    if (response.kind !== "answer") {
      throw new Error("Forventet et svar");
    }
    expect(response.text).toBe("Pakk keramikk i bobleplast og en solid eske.");
    expect(ids(response.sources)).toEqual(["sporsmal-2", "sporsmal-1"]);
  });

  it("gir svaret når kildene er current eller cleared", () => {
    const state = withModeration(
      withModeration(baseState(), "question", "sporsmal-1", "cleared"),
      "answer",
      "svar-2",
      "cleared",
    );

    expect(chatbotResponse(answered, state).kind).toBe("answer");
  });

  it("gir ingen svar når et kildespørsmål er flagget, og svaret kommer tilbake når flagget fjernes", () => {
    const flagged = withModeration(
      baseState(),
      "question",
      "sporsmal-1",
      "flagged",
    );
    expect(chatbotResponse(answered, flagged).kind).toBe("no-answer");

    const cleared = withModeration(
      flagged,
      "question",
      "sporsmal-1",
      "cleared",
    );
    expect(chatbotResponse(answered, cleared).kind).toBe("answer");
  });

  it("gir ingen svar når et kildesvar er flagget, og svaret kommer tilbake når flagget fjernes", () => {
    const flagged = withModeration(baseState(), "answer", "svar-2", "flagged");
    expect(chatbotResponse(answered, flagged).kind).toBe("no-answer");

    const cleared = withModeration(flagged, "answer", "svar-2", "cleared");
    expect(chatbotResponse(answered, cleared).kind).toBe("answer");
  });

  it("gir ingen svar når en kilde er fjernet", () => {
    for (const [kind, id] of [
      ["question", "sporsmal-2"],
      ["answer", "svar-1"],
    ] as const) {
      const state = withModeration(baseState(), kind, id, "removed");
      expect(chatbotResponse(answered, state).kind, id).toBe("no-answer");
    }
  });

  it("gir ingen svar når en kilde ikke finnes", () => {
    const state: DemoState = {
      ...baseState(),
      knowledgeBase: {
        ...baseState().knowledgeBase,
        answers: [],
      },
    };

    expect(chatbotResponse(answered, state).kind).toBe("no-answer");
  });

  it("gir ingen svar når et flagg er åpnet med flagContent", () => {
    const state = baseState();
    const result = knowledgeBaseCommandHandlers.flagContent?.(
      state,
      {
        type: "flagContent",
        targetKind: "answer",
        targetId: "svar-1",
        reason: "outdated",
      },
      context(people.ola),
    );
    expect(result?.ok).toBe(true);
    if (result === undefined || !result.ok) {
      throw new Error("Flagging feilet");
    }

    const flagged = chatbotResponse(answered, result.state);
    expect(flagged.kind).toBe("no-answer");

    const opened = result.state.knowledgeBase.reviews.at(-1);
    expect(opened).toBeDefined();
    const cleared = knowledgeBaseCommandHandlers.reviewContent?.(
      result.state,
      {
        type: "reviewContent",
        reviewId: opened?.id ?? "",
        decision: "clear",
      },
      context(people.marte),
    );
    if (cleared === undefined || !cleared.ok) {
      throw new Error("Vurderingen feilet");
    }
    expect(chatbotResponse(answered, cleared.state).kind).toBe("answer");
  });

  it("gir ingen svar når kilden er flagget i en åpen vurdering", () => {
    const state: DemoState = {
      ...baseState(),
      knowledgeBase: {
        ...baseState().knowledgeBase,
        answers: baseState().knowledgeBase.answers.map((item) =>
          item.id === "svar-1" ? { ...item, moderation: "flagged" } : item,
        ),
        flags: [flag("flagg-1", "vurdering-1", "answer", "svar-1")],
        reviews: [review("vurdering-1", "answer", "svar-1", ["flagg-1"])],
      },
    };

    expect(chatbotResponse(answered, state).kind).toBe("no-answer");
  });
});

describe("chatbotResponse uten forberedt svar", () => {
  it("gir ingen svar med de tre første treffene fra søket", () => {
    const state = baseState();
    const response = chatbotResponse(unanswered, state);

    expect(response.kind).toBe("no-answer");
    if (response.kind !== "no-answer") {
      throw new Error("Forventet ingen svar");
    }
    const expected = searchQuestions(unanswered.text, state).slice(0, 3);
    expect(expected.length).toBe(3);
    expect(ids(response.closest)).toEqual(ids(expected));
  });

  it("gir en tom liste over nærmeste spørsmål når ingenting passer", () => {
    const response = chatbotResponse(
      { id: "chatbot-3", text: "Zeppelinforsendelse til Mars?" },
      baseState(),
    );

    expect(response).toEqual({ kind: "no-answer", closest: [] });
  });

  it("bruker søket også når et forberedt svar blir til ingen svar", () => {
    const state = withModeration(baseState(), "answer", "svar-1", "flagged");
    const response = chatbotResponse(answered, state);

    if (response.kind !== "no-answer") {
      throw new Error("Forventet ingen svar");
    }
    expect(ids(response.closest)).toEqual(
      ids(searchQuestions(answered.text, state).slice(0, 3)),
    );
  });
});

describe("chatbotResponse og innhold fra en pågående demo", () => {
  it("bruker aldri spørsmål eller svar som er postet etterpå som kilder", () => {
    const first = knowledgeBaseCommandHandlers.postQuestion?.(
      baseState(),
      {
        type: "postQuestion",
        topicId: "tema-1",
        title: "Frakt av keramikk til Sverige",
        description: "Hvordan sender vi keramikk til Sverige?",
      },
      context(people.jonas, "2026-11-16T10:00:00+01:00", "ny"),
    );
    if (first === undefined || !first.ok) {
      throw new Error("Spørsmålet ble ikke postet");
    }
    const created = first.state.knowledgeBase.questions.at(-1);
    const second = knowledgeBaseCommandHandlers.postAnswer?.(
      first.state,
      {
        type: "postAnswer",
        questionId: created?.id ?? "",
        text: "Bruk bobleplast og en solid eske.",
      },
      context(people.per, "2026-11-16T11:00:00+01:00", "nytt-svar"),
    );
    if (second === undefined || !second.ok) {
      throw new Error("Svaret ble ikke postet");
    }
    const newAnswer = second.state.knowledgeBase.answers.at(-1);

    const response = chatbotResponse(answered, second.state);

    if (response.kind !== "answer") {
      throw new Error("Forventet et svar");
    }
    expect(ids(response.sources)).toEqual(["sporsmal-2", "sporsmal-1"]);
    expect(ids(response.sources)).not.toContain(created?.id);
    expect(answered.answer?.sourceAnswerIds).not.toContain(newAnswer?.id);
    expect(second.state.knowledgeBase.answers).toHaveLength(3);
  });

  it("gir aldri en tekst som ikke står i det forberedte svaret", () => {
    const state = baseState();
    const response = chatbotResponse(answered, state);

    if (response.kind !== "answer") {
      throw new Error("Forventet et svar");
    }
    expect(response.text).toBe(answered.answer?.text);

    const none = chatbotResponse(unanswered, state);
    expect(Object.keys(none).sort()).toEqual(["closest", "kind"]);
  });
});
