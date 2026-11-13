import { describe, expect, it } from "vitest";
import type { DemoState } from "../frame/types";
import type { Outcome, RequestStatus } from "../marketplace/types";
import {
  canEditAnswer,
  canEditQuestion,
  canFlag,
  canPost,
  canReview,
  canSeeFlaggers,
  canView,
  hasFlagged,
  isMember,
  memberBusinessOf,
} from "./permissions";
import {
  answer,
  flag,
  kbState,
  people,
  personOf,
  question,
  review,
  seedState,
} from "./testState";

function placedAt(
  state: DemoState,
  businessId: string,
  workerId: string,
  status: RequestStatus,
  outcome?: Outcome,
  requestId = `oppdrag-test-${businessId}`,
): DemoState {
  const base = state.marketplace.requests[0];
  if (base === undefined) {
    throw new Error("Mangler oppdrag");
  }
  return {
    ...state,
    marketplace: {
      ...state.marketplace,
      requests: [
        ...state.marketplace.requests,
        {
          ...base,
          id: requestId,
          businessId,
          status,
          outcome,
          agreement: {
            workerId,
            ownerAgreedAt: "2026-11-01T09:00:00+01:00",
            workerAgreedAt: "2026-11-02T09:00:00+01:00",
          },
        },
      ],
    },
  };
}

describe("isMember", () => {
  const state = seedState();

  it("er sann for eiere, ansatte og Silje Moen som er fast ansatt", () => {
    for (const id of [
      people.kari,
      people.jonas,
      people.per,
      people.ola,
      people.silje,
    ]) {
      expect(isMember(personOf(state, id), state), id).toBe(true);
    }
  });

  it("er usann for de som ikke jobber hos en E-Waves-bedrift", () => {
    for (const id of [people.anne, people.ingrid, people.mats, people.marte]) {
      expect(isMember(personOf(state, id), state), id).toBe(false);
    }
  });

  it("er sann for en som jobber pågående hos en medlemsbedrift", () => {
    const placed = placedAt(state, "bedrift-4", people.mats, "in-progress");
    expect(isMember(personOf(placed, people.mats), placed)).toBe(true);
  });

  it("er sann etter fullført oppdrag med utfall fast ansettelse", () => {
    const placed = placedAt(
      state,
      "bedrift-4",
      people.mats,
      "completed",
      "permanent",
    );
    expect(isMember(personOf(placed, people.mats), placed)).toBe(true);
  });

  it("er usann etter fullført oppdrag som planlagt", () => {
    const placed = placedAt(
      state,
      "bedrift-4",
      people.mats,
      "completed",
      "as-planned",
    );
    expect(isMember(personOf(placed, people.mats), placed)).toBe(false);
  });

  it("er usann når oppdraget er hos en bedrift som ikke er medlem", () => {
    const placed = placedAt(state, "bedrift-3", people.mats, "in-progress");
    expect(isMember(personOf(placed, people.mats), placed)).toBe(false);
  });
});

describe("memberBusinessOf", () => {
  const state = seedState();

  it("gir bedriften personen eier eller jobber hos", () => {
    expect(memberBusinessOf(personOf(state, people.kari), state)?.id).toBe(
      "bedrift-1",
    );
    expect(memberBusinessOf(personOf(state, people.jonas), state)?.id).toBe(
      "bedrift-1",
    );
    expect(memberBusinessOf(personOf(state, people.per), state)?.id).toBe(
      "bedrift-2",
    );
  });

  it("gir Kvadraturen Kaffebrenneri til Silje Moen", () => {
    const business = memberBusinessOf(personOf(state, people.silje), state);
    expect(business?.id).toBe("bedrift-4");
    expect(business?.name).toBe("Kvadraturen Kaffebrenneri");
  });

  it("gir den første medlemsbedriften i rekkefølgen når personen er knyttet til flere", () => {
    const placed = placedAt(
      placedAt(state, "bedrift-4", people.mats, "in-progress", undefined, "a"),
      "bedrift-2",
      people.mats,
      "in-progress",
      undefined,
      "b",
    );
    expect(memberBusinessOf(personOf(placed, people.mats), placed)?.id).toBe(
      "bedrift-2",
    );
  });

  it("gir ingenting til de som ikke er medlemmer", () => {
    expect(memberBusinessOf(personOf(state, people.anne), state)).toBe(
      undefined,
    );
    expect(memberBusinessOf(personOf(state, people.marte), state)).toBe(
      undefined,
    );
  });
});

describe("canView og canPost", () => {
  const state = seedState();

  it("lar medlemmer og administratorer se", () => {
    expect(canView(personOf(state, people.kari), state)).toBe(true);
    expect(canView(personOf(state, people.marte), state)).toBe(true);
    expect(canView(personOf(state, people.anne), state)).toBe(false);
    expect(canView(personOf(state, people.mats), state)).toBe(false);
  });

  it("lar bare medlemmer som ikke er administratorer skrive", () => {
    expect(canPost(personOf(state, people.kari), state)).toBe(true);
    expect(canPost(personOf(state, people.silje), state)).toBe(true);
    expect(canPost(personOf(state, people.marte), state)).toBe(false);
    expect(canPost(personOf(state, people.anne), state)).toBe(false);
  });

  it("lar ikke en administrator som også jobber hos en medlemsbedrift skrive", () => {
    const admin: DemoState = {
      ...state,
      frame: {
        ...state.frame,
        people: state.frame.people.map((person) =>
          person.id === people.kari
            ? { ...person, isVaroddAdmin: true }
            : person,
        ),
      },
    };
    const kari = personOf(admin, people.kari);
    expect(isMember(kari, admin)).toBe(true);
    expect(canView(kari, admin)).toBe(true);
    expect(canPost(kari, admin)).toBe(false);
  });
});

describe("canEditQuestion og canEditAnswer", () => {
  const state = seedState();
  const own = question("sporsmal-1", { authorId: people.jonas });
  const removed = question("sporsmal-2", {
    authorId: people.jonas,
    moderation: "removed",
  });
  const flagged = question("sporsmal-3", {
    authorId: people.jonas,
    moderation: "flagged",
  });
  const ownAnswer = answer("svar-1", "sporsmal-1", { authorId: people.per });
  const removedAnswer = answer("svar-2", "sporsmal-1", {
    authorId: people.per,
    moderation: "removed",
  });

  it("lar bare forfatteren redigere spørsmålet", () => {
    expect(canEditQuestion(personOf(state, people.jonas), own)).toBe(true);
    expect(canEditQuestion(personOf(state, people.kari), own)).toBe(false);
    expect(canEditQuestion(personOf(state, people.marte), own)).toBe(false);
  });

  it("lar forfatteren redigere et flagget spørsmål, men ikke et fjernet", () => {
    expect(canEditQuestion(personOf(state, people.jonas), flagged)).toBe(true);
    expect(canEditQuestion(personOf(state, people.jonas), removed)).toBe(false);
  });

  it("lar ikke en administrator redigere, heller ikke sitt eget", () => {
    const admin = personOf(state, people.marte);
    expect(canEditQuestion(admin, { ...own, authorId: admin.id })).toBe(false);
    expect(canEditAnswer(admin, { ...ownAnswer, authorId: admin.id })).toBe(
      false,
    );
  });

  it("lar bare forfatteren redigere svaret, og ikke et fjernet svar", () => {
    expect(canEditAnswer(personOf(state, people.per), ownAnswer)).toBe(true);
    expect(canEditAnswer(personOf(state, people.jonas), ownAnswer)).toBe(false);
    expect(canEditAnswer(personOf(state, people.per), removedAnswer)).toBe(
      false,
    );
  });
});

describe("canFlag", () => {
  const q = question("sporsmal-1", { authorId: people.jonas });
  const a = answer("svar-1", "sporsmal-1", { authorId: people.ola });
  const removedAnswer = answer("svar-2", "sporsmal-1", {
    authorId: people.ola,
    moderation: "removed",
  });
  const state = kbState({
    questions: [q],
    answers: [a, removedAnswer],
  });
  const answerTarget = { targetKind: "answer" as const, targetId: "svar-1" };
  const questionTarget = {
    targetKind: "question" as const,
    targetId: "sporsmal-1",
  };

  it("lar et medlem som ikke er forfatteren flagge", () => {
    expect(canFlag(personOf(state, people.per), answerTarget, state)).toBe(
      true,
    );
    expect(canFlag(personOf(state, people.per), questionTarget, state)).toBe(
      true,
    );
  });

  it("lar ikke forfatteren flagge sitt eget innlegg", () => {
    expect(canFlag(personOf(state, people.ola), answerTarget, state)).toBe(
      false,
    );
    expect(canFlag(personOf(state, people.jonas), questionTarget, state)).toBe(
      false,
    );
  });

  it("lar ikke administratorer og ikke-medlemmer flagge", () => {
    expect(canFlag(personOf(state, people.marte), answerTarget, state)).toBe(
      false,
    );
    expect(canFlag(personOf(state, people.anne), answerTarget, state)).toBe(
      false,
    );
  });

  it("lar ikke noen flagge et fjernet innlegg eller noe som ikke finnes", () => {
    expect(
      canFlag(
        personOf(state, people.per),
        { targetKind: "answer", targetId: "svar-2" },
        state,
      ),
    ).toBe(false);
    expect(
      canFlag(
        personOf(state, people.per),
        { targetKind: "answer", targetId: "finnes-ikke" },
        state,
      ),
    ).toBe(false);
  });

  it("lar ikke et medlem flagge to ganger i den åpne vurderingen, men lar andre flagge", () => {
    const flagged = kbState({
      questions: [q],
      answers: [{ ...a, moderation: "flagged" }],
      flags: [flag("flagg-1", "vurdering-1", "answer", "svar-1")],
      reviews: [review("vurdering-1", "answer", "svar-1", ["flagg-1"])],
    });
    expect(canFlag(personOf(flagged, people.per), answerTarget, flagged)).toBe(
      false,
    );
    expect(canFlag(personOf(flagged, people.kari), answerTarget, flagged)).toBe(
      true,
    );
  });

  it("lar et medlem flagge igjen etter at vurderingen er avsluttet", () => {
    const cleared = kbState({
      questions: [q],
      answers: [{ ...a, moderation: "cleared" }],
      flags: [flag("flagg-1", "vurdering-1", "answer", "svar-1")],
      reviews: [
        review("vurdering-1", "answer", "svar-1", ["flagg-1"], {
          outcome: "cleared",
          reviewedBy: people.marte,
          reviewedAt: "2026-11-12T09:00:00+01:00",
        }),
      ],
    });
    expect(canFlag(personOf(cleared, people.per), answerTarget, cleared)).toBe(
      true,
    );
  });
});

describe("hasFlagged", () => {
  const q = question("sporsmal-1", { authorId: people.jonas });
  const a = answer("svar-1", "sporsmal-1", { authorId: people.ola });
  const target = { targetKind: "answer" as const, targetId: "svar-1" };
  const flagged = kbState({
    questions: [q],
    answers: [{ ...a, moderation: "flagged" }],
    flags: [flag("flagg-1", "vurdering-1", "answer", "svar-1")],
    reviews: [review("vurdering-1", "answer", "svar-1", ["flagg-1"])],
  });

  it("er sann for den som har flagget i den åpne vurderingen", () => {
    expect(hasFlagged(personOf(flagged, people.per), target, flagged)).toBe(
      true,
    );
  });

  it("er usann for andre og når ingenting er flagget", () => {
    expect(hasFlagged(personOf(flagged, people.kari), target, flagged)).toBe(
      false,
    );
    const plain = kbState({ questions: [q], answers: [a] });
    expect(hasFlagged(personOf(plain, people.per), target, plain)).toBe(false);
  });

  it("er usann etter at vurderingen er avsluttet", () => {
    const cleared = kbState({
      questions: [q],
      answers: [{ ...a, moderation: "cleared" }],
      flags: [flag("flagg-1", "vurdering-1", "answer", "svar-1")],
      reviews: [
        review("vurdering-1", "answer", "svar-1", ["flagg-1"], {
          outcome: "cleared",
          reviewedBy: people.marte,
          reviewedAt: "2026-11-12T09:00:00+01:00",
        }),
      ],
    });
    expect(hasFlagged(personOf(cleared, people.per), target, cleared)).toBe(
      false,
    );
  });
});

describe("canReview og canSeeFlaggers", () => {
  const state = seedState();

  it("er bare for administratorer", () => {
    expect(canReview(personOf(state, people.marte))).toBe(true);
    expect(canReview(personOf(state, people.kari))).toBe(false);
    expect(canReview(personOf(state, people.anne))).toBe(false);
    expect(canSeeFlaggers(personOf(state, people.marte))).toBe(true);
    expect(canSeeFlaggers(personOf(state, people.kari))).toBe(false);
    expect(canSeeFlaggers(personOf(state, people.anne))).toBe(false);
  });
});
