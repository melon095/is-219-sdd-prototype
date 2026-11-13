import { describe, expect, it } from "vitest";
import type { CommandResult, DemoState } from "../frame/types";
import { editAnswer } from "./answers";
import { flagContent, openReviews, reviewContent } from "./moderation";
import { editQuestion } from "./questions";
import { questionStatus } from "./status";
import {
  answer,
  context,
  flag,
  kbState,
  people,
  question,
  review,
} from "./testState";

const membersGroup = "knowledgeBase.members";

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

function baseState(): DemoState {
  return kbState({
    questions: [question("sporsmal-1", { authorId: people.jonas })],
    answers: [
      answer("svar-1", "sporsmal-1", {
        authorId: people.per,
        businessId: "bedrift-2",
      }),
      answer("svar-2", "sporsmal-1", {
        authorId: people.ola,
        businessId: "bedrift-4",
        createdAt: "2026-11-10T11:00:00+01:00",
      }),
    ],
  });
}

function singleAnswerState(): DemoState {
  return kbState({
    questions: [question("sporsmal-1", { authorId: people.jonas })],
    answers: [
      answer("svar-1", "sporsmal-1", {
        authorId: people.ola,
        businessId: "bedrift-4",
      }),
    ],
  });
}

function flagAs(
  state: DemoState,
  actorId: string,
  overrides: Record<string, unknown> = {},
  now = "2026-11-16T10:00:00+01:00",
  prefix = "ny",
): CommandResult {
  return flagContent(
    state,
    {
      type: "flagContent",
      targetKind: "answer",
      targetId: "svar-1",
      reason: "outdated",
      ...overrides,
    },
    context(actorId, now, prefix),
  );
}

function decide(
  state: DemoState,
  actorId: string,
  reviewId: string,
  decision: string,
  now = "2026-11-17T09:00:00+01:00",
  prefix = "vu",
): CommandResult {
  return reviewContent(
    state,
    { type: "reviewContent", reviewId, decision },
    context(actorId, now, prefix),
  );
}

function reviewOf(state: DemoState, targetId: string) {
  const found = state.knowledgeBase.reviews.find(
    (item) => item.targetId === targetId && item.outcome === undefined,
  );
  if (found === undefined) {
    throw new Error(`Mangler åpen vurdering for ${targetId}`);
  }
  return found;
}

function questionOf(state: DemoState, id: string) {
  const found = state.knowledgeBase.questions.find((item) => item.id === id);
  if (found === undefined) {
    throw new Error(`Mangler spørsmål ${id}`);
  }
  return found;
}

function answerOf(state: DemoState, id: string) {
  const found = state.knowledgeBase.answers.find((item) => item.id === id);
  if (found === undefined) {
    throw new Error(`Mangler svar ${id}`);
  }
  return found;
}

function newEntries(before: DemoState, after: DemoState) {
  return after.frame.activity.slice(before.frame.activity.length);
}

describe("flagContent permissions", () => {
  it("lets members who are not the author flag", () => {
    expect(flagAs(baseState(), people.kari).ok).toBe(true);
    expect(flagAs(baseState(), people.jonas).ok).toBe(true);
    expect(flagAs(baseState(), people.ola).ok).toBe(true);
    expect(
      flagAs(baseState(), people.per, {
        targetKind: "question",
        targetId: "sporsmal-1",
      }).ok,
    ).toBe(true);
  });

  it("refuses the author of the content", () => {
    expect(codeOf(flagAs(baseState(), people.per))).toBe("not-allowed");
    expect(
      codeOf(
        flagAs(baseState(), people.jonas, {
          targetKind: "question",
          targetId: "sporsmal-1",
        }),
      ),
    ).toBe("not-allowed");
  });

  it("refuses administrators and non-members", () => {
    expect(codeOf(flagAs(baseState(), people.marte))).toBe("not-allowed");
    expect(codeOf(flagAs(baseState(), people.anne))).toBe("not-allowed");
  });

  it("refuses a member who already has a flag in the open review", () => {
    const flagged = stateOf(flagAs(baseState(), people.kari));
    expect(codeOf(flagAs(flagged, people.kari))).toBe("not-allowed");
  });

  it("lets a member flag again after the review was cleared", () => {
    const flagged = stateOf(flagAs(baseState(), people.kari));
    const cleared = stateOf(
      decide(flagged, people.marte, reviewOf(flagged, "svar-1").id, "clear"),
    );
    expect(flagAs(cleared, people.kari).ok).toBe(true);
  });

  it("changes nothing when it fails", () => {
    const state = baseState();
    const result = flagAs(state, people.per);
    expect(result.ok).toBe(false);
    expect(state.knowledgeBase.flags).toEqual([]);
    expect(state.knowledgeBase.reviews).toEqual([]);
    expect(answerOf(state, "svar-1").moderation).toBe("current");
  });
});

describe("flagContent not found", () => {
  it("gives not-found for an unknown target", () => {
    expect(
      codeOf(flagAs(baseState(), people.kari, { targetId: "svar-99" })),
    ).toBe("not-found");
    expect(
      codeOf(
        flagAs(baseState(), people.kari, {
          targetKind: "question",
          targetId: "sporsmal-99",
        }),
      ),
    ).toBe("not-found");
  });

  it("gives not-found for a removed target", () => {
    const state = kbState({
      questions: [question("sporsmal-1", { authorId: people.jonas })],
      answers: [answer("svar-1", "sporsmal-1", { moderation: "removed" })],
    });
    expect(codeOf(flagAs(state, people.kari))).toBe("not-found");
    const removedQuestion = kbState({
      questions: [
        question("sporsmal-1", {
          authorId: people.jonas,
          moderation: "removed",
        }),
      ],
    });
    expect(
      codeOf(
        flagAs(removedQuestion, people.kari, {
          targetKind: "question",
          targetId: "sporsmal-1",
        }),
      ),
    ).toBe("not-found");
  });
});

describe("flagContent validation", () => {
  it("accepts each of the five reasons", () => {
    for (const reason of [
      "outdated",
      "incorrect",
      "spam",
      "off-topic",
      "other",
    ]) {
      expect(
        flagAs(baseState(), people.kari, { reason, note: "Forklaring" }).ok,
      ).toBe(true);
    }
  });

  it("rejects an unknown reason", () => {
    expect(
      fieldErrorsOf(flagAs(baseState(), people.kari, { reason: "rude" }))
        .reason,
    ).toBeTruthy();
    expect(
      fieldErrorsOf(flagAs(baseState(), people.kari, { reason: 5 })).reason,
    ).toBeTruthy();
  });

  it("requires a note when the reason is other", () => {
    expect(
      fieldErrorsOf(flagAs(baseState(), people.kari, { reason: "other" })).note,
    ).toBe("Fortell kort hva som er galt");
    expect(
      fieldErrorsOf(
        flagAs(baseState(), people.kari, { reason: "other", note: "   " }),
      ).note,
    ).toBe("Fortell kort hva som er galt");
  });

  it("allows an empty note for the other reasons", () => {
    expect(flagAs(baseState(), people.kari, { reason: "spam" }).ok).toBe(true);
    expect(
      flagAs(baseState(), people.kari, { reason: "spam", note: "  " }).ok,
    ).toBe(true);
  });

  it("rejects a note longer than 500 characters after trimming", () => {
    expect(
      fieldErrorsOf(flagAs(baseState(), people.kari, { note: "a".repeat(501) }))
        .note,
    ).toBe("Fortell kort hva som er galt");
    expect(
      flagAs(baseState(), people.kari, { note: `  ${"a".repeat(500)}  ` }).ok,
    ).toBe(true);
  });

  it("stores the trimmed note, and leaves it out when empty", () => {
    const withNote = stateOf(
      flagAs(baseState(), people.kari, { note: "  Gammel pris.  " }),
    );
    expect(withNote.knowledgeBase.flags[0]?.note).toBe("Gammel pris.");
    const withoutNote = stateOf(
      flagAs(baseState(), people.kari, { note: "  " }),
    );
    expect(withoutNote.knowledgeBase.flags[0]).not.toHaveProperty("note");
  });
});

describe("flagContent effects", () => {
  it("opens a review and marks the target as flagged", () => {
    const state = stateOf(
      flagAs(baseState(), people.kari, { reason: "incorrect" }),
    );
    const [storedFlag] = state.knowledgeBase.flags;
    const [storedReview] = state.knowledgeBase.reviews;
    if (storedFlag === undefined || storedReview === undefined) {
      throw new Error("Mangler flagg eller vurdering");
    }
    expect(state.knowledgeBase.flags).toHaveLength(1);
    expect(state.knowledgeBase.reviews).toHaveLength(1);
    expect(storedFlag).toEqual({
      id: storedFlag.id,
      reviewId: storedReview.id,
      targetKind: "answer",
      targetId: "svar-1",
      flaggedBy: people.kari,
      reason: "incorrect",
      at: "2026-11-16T10:00:00+01:00",
    });
    expect(storedReview).toEqual({
      id: storedReview.id,
      targetKind: "answer",
      targetId: "svar-1",
      openedAt: "2026-11-16T10:00:00+01:00",
      flagIds: [storedFlag.id],
    });
    expect(storedFlag.id).not.toBe(storedReview.id);
    expect(answerOf(state, "svar-1").moderation).toBe("flagged");
    expect(answerOf(state, "svar-2").moderation).toBe("current");
  });

  it("flags a question", () => {
    const state = stateOf(
      flagAs(baseState(), people.per, {
        targetKind: "question",
        targetId: "sporsmal-1",
        reason: "spam",
      }),
    );
    expect(questionOf(state, "sporsmal-1").moderation).toBe("flagged");
    expect(state.knowledgeBase.reviews[0]).toMatchObject({
      targetKind: "question",
      targetId: "sporsmal-1",
    });
  });

  it("flags a cleared item again with a new review", () => {
    const flagged = stateOf(flagAs(baseState(), people.kari));
    const firstReview = reviewOf(flagged, "svar-1");
    const cleared = stateOf(
      decide(flagged, people.marte, firstReview.id, "clear"),
    );
    expect(answerOf(cleared, "svar-1").moderation).toBe("cleared");
    const again = stateOf(
      flagAs(cleared, people.kari, {}, "2026-11-18T10:00:00+01:00", "ny2"),
    );
    expect(answerOf(again, "svar-1").moderation).toBe("flagged");
    expect(again.knowledgeBase.reviews).toHaveLength(2);
    const second = reviewOf(again, "svar-1");
    expect(second.id).not.toBe(firstReview.id);
    expect(second.flagIds).toHaveLength(1);
    expect(
      again.knowledgeBase.reviews.find((item) => item.id === firstReview.id)
        ?.outcome,
    ).toBe("cleared");
  });

  it("lets a second member's flag join the same open review", () => {
    const first = stateOf(flagAs(baseState(), people.kari));
    const second = stateOf(
      flagAs(
        first,
        people.jonas,
        { reason: "spam" },
        "2026-11-16T12:00:00+01:00",
        "ny2",
      ),
    );
    expect(second.knowledgeBase.reviews).toHaveLength(1);
    expect(second.knowledgeBase.flags).toHaveLength(2);
    const joined = reviewOf(second, "svar-1");
    expect(joined.flagIds).toEqual(
      second.knowledgeBase.flags.map((item) => item.id),
    );
    expect(joined.openedAt).toBe("2026-11-16T10:00:00+01:00");
    expect(
      second.knowledgeBase.flags.every((item) => item.reviewId === joined.id),
    ).toBe(true);
    expect(answerOf(second, "svar-1").moderation).toBe("flagged");
  });

  it("returns the info notice", () => {
    const result = flagAs(baseState(), people.kari);
    expect(result.ok && result.notices).toEqual([
      { kind: "info", message: "Takk! Varodd ser på det du har flagget." },
    ]);
  });

  it("does not change the old state", () => {
    const before = baseState();
    flagAs(before, people.kari);
    expect(before.knowledgeBase.flags).toEqual([]);
    expect(before.knowledgeBase.reviews).toEqual([]);
    expect(answerOf(before, "svar-1").moderation).toBe("current");
  });
});

describe("flagContent activity", () => {
  it("tells the author and the flagger", () => {
    const before = baseState();
    const state = stateOf(flagAs(before, people.kari));
    const added = newEntries(before, state);
    expect(added).toHaveLength(1);
    const entry = added[0];
    expect(entry).toMatchObject({
      at: "2026-11-16T10:00:00+01:00",
      featureId: "knowledgeBase",
      actor: people.kari,
      text: "Et innlegg i «Hvordan setter jeg opp frakt i nettbutikken?» er flagget og venter på vurdering",
      target: { route: "/kunnskapsbank/sporsmal/sporsmal-1" },
      audience: {
        personIds: [people.per, people.kari],
        groups: [],
        requiredGroup: membersGroup,
      },
    });
  });

  it("links a flagged question to its own page and tells its author", () => {
    const before = baseState();
    const state = stateOf(
      flagAs(before, people.per, {
        targetKind: "question",
        targetId: "sporsmal-1",
      }),
    );
    const [entry] = newEntries(before, state);
    expect(entry?.audience.personIds).toEqual([people.jonas, people.per]);
    expect(entry?.target.route).toBe("/kunnskapsbank/sporsmal/sporsmal-1");
  });

  it("adds an entry for a flag that joins an open review", () => {
    const first = stateOf(flagAs(baseState(), people.kari));
    const second = stateOf(
      flagAs(first, people.jonas, {}, "2026-11-16T12:00:00+01:00", "ny2"),
    );
    const added = newEntries(first, second);
    expect(added).toHaveLength(1);
    expect(added[0]?.audience.personIds).toEqual([people.per, people.jonas]);
  });
});

describe("flagContent and the question status", () => {
  it("makes the question open when its only answer is flagged", () => {
    const before = singleAnswerState();
    const target = questionOf(before, "sporsmal-1");
    expect(questionStatus(target, before)).toBe("answered");
    const after = stateOf(flagAs(before, people.kari));
    expect(questionStatus(target, after)).toBe("open");
  });

  it("keeps the question answered when one of two answers is flagged", () => {
    const before = baseState();
    const target = questionOf(before, "sporsmal-1");
    const after = stateOf(flagAs(before, people.kari));
    expect(questionStatus(target, after)).toBe("answered");
  });
});

describe("reviewContent permissions and errors", () => {
  function flaggedState(): { state: DemoState; reviewId: string } {
    const state = stateOf(flagAs(baseState(), people.kari));
    return { state, reviewId: reviewOf(state, "svar-1").id };
  }

  it("lets an administrator decide", () => {
    const { state, reviewId } = flaggedState();
    expect(decide(state, people.marte, reviewId, "clear").ok).toBe(true);
    expect(decide(state, people.marte, reviewId, "remove").ok).toBe(true);
  });

  it("refuses everyone but administrators", () => {
    const { state, reviewId } = flaggedState();
    for (const actor of [
      people.kari,
      people.jonas,
      people.per,
      people.ola,
      people.anne,
    ]) {
      expect(codeOf(decide(state, actor, reviewId, "clear"))).toBe(
        "not-allowed",
      );
    }
  });

  it("gives not-found for an unknown review", () => {
    const { state } = flaggedState();
    expect(codeOf(decide(state, people.marte, "vurdering-99", "clear"))).toBe(
      "not-found",
    );
  });

  it("gives invalid-status for a closed review", () => {
    const { state, reviewId } = flaggedState();
    const closed = stateOf(decide(state, people.marte, reviewId, "clear"));
    expect(codeOf(decide(closed, people.marte, reviewId, "clear"))).toBe(
      "invalid-status",
    );
    expect(codeOf(decide(closed, people.marte, reviewId, "remove"))).toBe(
      "invalid-status",
    );
  });

  it("rejects an unknown decision", () => {
    const { state, reviewId } = flaggedState();
    expect(
      fieldErrorsOf(decide(state, people.marte, reviewId, "later")).decision,
    ).toBeTruthy();
  });

  it("changes nothing when it fails", () => {
    const { state, reviewId } = flaggedState();
    const result = decide(state, people.kari, reviewId, "remove");
    expect(result.ok).toBe(false);
    expect(answerOf(state, "svar-1").moderation).toBe("flagged");
    expect(reviewOf(state, "svar-1").outcome).toBeUndefined();
  });
});

describe("reviewContent clear", () => {
  it("closes the review and sets the target to cleared", () => {
    const flagged = stateOf(flagAs(baseState(), people.kari));
    const open = reviewOf(flagged, "svar-1");
    const state = stateOf(decide(flagged, people.marte, open.id, "clear"));
    expect(state.knowledgeBase.reviews).toEqual([
      {
        ...open,
        outcome: "cleared",
        reviewedBy: people.marte,
        reviewedAt: "2026-11-17T09:00:00+01:00",
      },
    ]);
    expect(answerOf(state, "svar-1").moderation).toBe("cleared");
  });

  it("makes the question answered again when the flagged answer was the only one", () => {
    const flagged = stateOf(flagAs(singleAnswerState(), people.kari));
    const target = questionOf(flagged, "sporsmal-1");
    expect(questionStatus(target, flagged)).toBe("open");
    const cleared = stateOf(
      decide(flagged, people.marte, reviewOf(flagged, "svar-1").id, "clear"),
    );
    expect(questionStatus(target, cleared)).toBe("answered");
  });

  it("clears a question", () => {
    const flagged = stateOf(
      flagAs(baseState(), people.per, {
        targetKind: "question",
        targetId: "sporsmal-1",
      }),
    );
    const cleared = stateOf(
      decide(
        flagged,
        people.marte,
        reviewOf(flagged, "sporsmal-1").id,
        "clear",
      ),
    );
    expect(questionOf(cleared, "sporsmal-1").moderation).toBe("cleared");
    expect(answerOf(cleared, "svar-1").moderation).toBe("current");
  });

  it("tells the author and every flagger that it was kept", () => {
    const first = stateOf(flagAs(baseState(), people.kari));
    const second = stateOf(
      flagAs(first, people.jonas, {}, "2026-11-16T12:00:00+01:00", "ny2"),
    );
    const added = newEntries(
      second,
      stateOf(
        decide(second, people.marte, reviewOf(second, "svar-1").id, "clear"),
      ),
    );
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      at: "2026-11-17T09:00:00+01:00",
      featureId: "knowledgeBase",
      actor: people.marte,
      text: "Varodd har vurdert et flagget innlegg i «Hvordan setter jeg opp frakt i nettbutikken?»: det er beholdt",
      target: { route: "/kunnskapsbank/sporsmal/sporsmal-1" },
      audience: {
        personIds: [people.per, people.kari, people.jonas],
        groups: [],
        requiredGroup: membersGroup,
      },
    });
  });
});

describe("reviewContent remove an answer", () => {
  it("sets the answer to removed and closes the review", () => {
    const flagged = stateOf(flagAs(baseState(), people.kari));
    const open = reviewOf(flagged, "svar-1");
    const state = stateOf(decide(flagged, people.marte, open.id, "remove"));
    expect(answerOf(state, "svar-1").moderation).toBe("removed");
    expect(answerOf(state, "svar-2").moderation).toBe("current");
    expect(state.knowledgeBase.reviews[0]).toMatchObject({
      outcome: "removed",
      reviewedBy: people.marte,
      reviewedAt: "2026-11-17T09:00:00+01:00",
    });
    expect(questionOf(state, "sporsmal-1").moderation).toBe("current");
  });

  it("leaves the question open when no other answer counts", () => {
    const flagged = stateOf(flagAs(singleAnswerState(), people.kari));
    const removed = stateOf(
      decide(flagged, people.marte, reviewOf(flagged, "svar-1").id, "remove"),
    );
    expect(questionStatus(questionOf(removed, "sporsmal-1"), removed)).toBe(
      "open",
    );
  });

  it("keeps the question answered when another answer counts", () => {
    const flagged = stateOf(flagAs(baseState(), people.kari));
    const removed = stateOf(
      decide(flagged, people.marte, reviewOf(flagged, "svar-1").id, "remove"),
    );
    expect(questionStatus(questionOf(removed, "sporsmal-1"), removed)).toBe(
      "answered",
    );
  });

  it("tells the author and the flaggers that it was removed", () => {
    const flagged = stateOf(flagAs(baseState(), people.kari));
    const added = newEntries(
      flagged,
      stateOf(
        decide(flagged, people.marte, reviewOf(flagged, "svar-1").id, "remove"),
      ),
    );
    expect(added).toHaveLength(1);
    expect(added[0]?.text).toBe(
      "Varodd har vurdert et flagget innlegg i «Hvordan setter jeg opp frakt i nettbutikken?»: det er fjernet",
    );
    expect(added[0]?.audience.personIds).toEqual([people.per, people.kari]);
  });
});

describe("reviewContent remove a question", () => {
  function threadState(): DemoState {
    const asked = stateOf(
      flagAs(baseState(), people.kari, {
        targetKind: "question",
        targetId: "sporsmal-1",
      }),
    );
    const answerFlagged = stateOf(
      flagAs(asked, people.jonas, {}, "2026-11-16T11:00:00+01:00", "ny2"),
    );
    return stateOf(
      flagAs(
        answerFlagged,
        people.kari,
        { targetId: "svar-2" },
        "2026-11-16T12:00:00+01:00",
        "ny3",
      ),
    );
  }

  it("removes the question and every answer in it", () => {
    const before = threadState();
    const state = stateOf(
      decide(before, people.marte, reviewOf(before, "sporsmal-1").id, "remove"),
    );
    expect(questionOf(state, "sporsmal-1").moderation).toBe("removed");
    expect(answerOf(state, "svar-1").moderation).toBe("removed");
    expect(answerOf(state, "svar-2").moderation).toBe("removed");
  });

  it("closes every open review in the thread as removed", () => {
    const before = threadState();
    expect(openReviews(before)).toHaveLength(3);
    const state = stateOf(
      decide(before, people.marte, reviewOf(before, "sporsmal-1").id, "remove"),
    );
    expect(openReviews(state)).toEqual([]);
    for (const item of state.knowledgeBase.reviews) {
      expect(item).toMatchObject({
        outcome: "removed",
        reviewedBy: people.marte,
        reviewedAt: "2026-11-17T09:00:00+01:00",
      });
    }
  });

  it("leaves reviews in other threads alone", () => {
    const base = threadState();
    const withOther = {
      ...base,
      knowledgeBase: {
        ...base.knowledgeBase,
        questions: [
          ...base.knowledgeBase.questions,
          question("sporsmal-2", { authorId: people.kari }),
        ],
        answers: [
          ...base.knowledgeBase.answers,
          answer("svar-3", "sporsmal-2", { authorId: people.per }),
        ],
        flags: [
          ...base.knowledgeBase.flags,
          flag("flagg-9", "vurdering-9", "answer", "svar-3", {
            flaggedBy: people.ola,
          }),
        ],
        reviews: [
          ...base.knowledgeBase.reviews,
          review("vurdering-9", "answer", "svar-3", ["flagg-9"]),
        ],
      },
    };
    const state = stateOf(
      decide(
        withOther,
        people.marte,
        reviewOf(withOther, "sporsmal-1").id,
        "remove",
      ),
    );
    expect(openReviews(state).map((item) => item.id)).toEqual(["vurdering-9"]);
    expect(answerOf(state, "svar-3").moderation).toBe("current");
    expect(questionOf(state, "sporsmal-2").moderation).toBe("current");
  });

  it("adds one outcome entry for each review closed", () => {
    const before = threadState();
    const state = stateOf(
      decide(before, people.marte, reviewOf(before, "sporsmal-1").id, "remove"),
    );
    const added = newEntries(before, state);
    expect(added).toHaveLength(3);
    for (const entry of added) {
      expect(entry.text).toBe(
        "Varodd har vurdert et flagget innlegg i «Hvordan setter jeg opp frakt i nettbutikken?»: det er fjernet",
      );
      expect(entry.actor).toBe(people.marte);
      expect(entry.audience.requiredGroup).toBe(membersGroup);
    }
    const recipients = added.map((entry) => entry.audience.personIds);
    expect(recipients).toContainEqual([people.jonas, people.kari]);
    expect(recipients).toContainEqual([people.per, people.jonas]);
    expect(recipients).toContainEqual([people.ola, people.kari]);
    expect(new Set(added.map((entry) => entry.id)).size).toBe(3);
  });
});

describe("editing flagged content", () => {
  it("keeps a flagged question flagged", () => {
    const flagged = stateOf(
      flagAs(baseState(), people.per, {
        targetKind: "question",
        targetId: "sporsmal-1",
      }),
    );
    const edited = stateOf(
      editQuestion(
        flagged,
        {
          type: "editQuestion",
          questionId: "sporsmal-1",
          topicId: "tema-1",
          title: "Ny tittel",
          description: "Ny beskrivelse.",
        },
        context(people.jonas, "2026-11-17T08:00:00+01:00", "ed"),
      ),
    );
    expect(questionOf(edited, "sporsmal-1").moderation).toBe("flagged");
    expect(reviewOf(edited, "sporsmal-1").outcome).toBeUndefined();
  });

  it("keeps a flagged answer flagged", () => {
    const flagged = stateOf(flagAs(baseState(), people.kari));
    const edited = stateOf(
      editAnswer(
        flagged,
        { type: "editAnswer", answerId: "svar-1", text: "Oppdatert svar." },
        context(people.per, "2026-11-17T08:00:00+01:00", "ed"),
      ),
    );
    expect(answerOf(edited, "svar-1").moderation).toBe("flagged");
    expect(reviewOf(edited, "svar-1").outcome).toBeUndefined();
  });
});

describe("openReviews", () => {
  it("returns open reviews oldest first and leaves out closed ones", () => {
    const state = kbState({
      questions: [question("sporsmal-1", { authorId: people.jonas })],
      answers: [
        answer("svar-1", "sporsmal-1"),
        answer("svar-2", "sporsmal-1"),
        answer("svar-3", "sporsmal-1"),
      ],
      reviews: [
        review("vurdering-1", "answer", "svar-1", ["flagg-1"], {
          openedAt: "2026-11-12T09:00:00+01:00",
        }),
        review("vurdering-2", "answer", "svar-2", ["flagg-2"], {
          openedAt: "2026-11-11T09:00:00+01:00",
        }),
        review("vurdering-3", "answer", "svar-3", ["flagg-3"], {
          openedAt: "2026-11-10T09:00:00+01:00",
          outcome: "cleared",
          reviewedBy: people.marte,
          reviewedAt: "2026-11-13T09:00:00+01:00",
        }),
      ],
    });
    expect(openReviews(state).map((item) => item.id)).toEqual([
      "vurdering-2",
      "vurdering-1",
    ]);
  });

  it("returns an empty list when nothing waits", () => {
    expect(openReviews(kbState({}))).toEqual([]);
  });
});
