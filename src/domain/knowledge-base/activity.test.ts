import { describe, expect, it } from "vitest";
import {
  answerPostedActivity,
  contentFlaggedActivity,
  questionPostedActivity,
  reviewFinishedActivity,
} from "./activity";
import { context, people, question } from "./testState";

const q = question("sporsmal-7", {
  title: "Hvordan setter jeg opp frakt?",
  authorId: people.jonas,
});

describe("questionPostedActivity", () => {
  it("lager en oppføring til alle medlemmer", () => {
    const ctx = context(people.jonas, "2026-11-16T10:00:00+01:00", "akt");
    expect(questionPostedActivity(q, ctx)).toEqual({
      id: "akt-1",
      at: "2026-11-16T10:00:00+01:00",
      featureId: "knowledgeBase",
      actor: people.jonas,
      text: "Nytt spørsmål: «Hvordan setter jeg opp frakt?»",
      target: { route: "/kunnskapsbank/sporsmal/sporsmal-7" },
      audience: {
        personIds: [],
        groups: ["knowledgeBase.members"],
        requiredGroup: "knowledgeBase.members",
      },
    });
  });
});

describe("answerPostedActivity", () => {
  it("nevner bedriften som svarte og går til alle medlemmer", () => {
    const ctx = context(people.per, "2026-11-16T11:00:00+01:00", "akt");
    expect(answerPostedActivity(q, "Sørlandet Honning", ctx)).toEqual({
      id: "akt-1",
      at: "2026-11-16T11:00:00+01:00",
      featureId: "knowledgeBase",
      actor: people.per,
      text: "Sørlandet Honning svarte på «Hvordan setter jeg opp frakt?»",
      target: { route: "/kunnskapsbank/sporsmal/sporsmal-7" },
      audience: {
        personIds: [],
        groups: ["knowledgeBase.members"],
        requiredGroup: "knowledgeBase.members",
      },
    });
  });
});

describe("contentFlaggedActivity", () => {
  it("går til forfatteren og den som flagget", () => {
    const ctx = context(people.per, "2026-11-16T12:00:00+01:00", "akt");
    expect(contentFlaggedActivity(q, people.ola, people.per, ctx)).toEqual({
      id: "akt-1",
      at: "2026-11-16T12:00:00+01:00",
      featureId: "knowledgeBase",
      actor: people.per,
      text: "Et innlegg i «Hvordan setter jeg opp frakt?» er flagget og venter på vurdering",
      target: { route: "/kunnskapsbank/sporsmal/sporsmal-7" },
      audience: {
        personIds: [people.ola, people.per],
        groups: [],
        requiredGroup: "knowledgeBase.members",
      },
    });
  });
});

describe("reviewFinishedActivity", () => {
  it("sier at innlegget er beholdt", () => {
    const ctx = context(people.marte, "2026-11-17T09:00:00+01:00", "akt");
    const entry = reviewFinishedActivity(
      q,
      "cleared",
      people.ola,
      [people.per, people.kari],
      ctx,
    );
    expect(entry).toEqual({
      id: "akt-1",
      at: "2026-11-17T09:00:00+01:00",
      featureId: "knowledgeBase",
      actor: people.marte,
      text: "Varodd har vurdert et flagget innlegg i «Hvordan setter jeg opp frakt?»: det er beholdt",
      target: { route: "/kunnskapsbank/sporsmal/sporsmal-7" },
      audience: {
        personIds: [people.ola, people.per, people.kari],
        groups: [],
        requiredGroup: "knowledgeBase.members",
      },
    });
  });

  it("sier at innlegget er fjernet", () => {
    const entry = reviewFinishedActivity(
      q,
      "removed",
      people.ola,
      [people.per],
      context(people.marte),
    );
    expect(entry.text).toBe(
      "Varodd har vurdert et flagget innlegg i «Hvordan setter jeg opp frakt?»: det er fjernet",
    );
  });

  it("tar ikke med samme person to ganger", () => {
    const entry = reviewFinishedActivity(
      q,
      "removed",
      people.ola,
      [people.per, people.ola, people.per],
      context(people.marte),
    );
    expect(entry.audience.personIds).toEqual([people.ola, people.per]);
  });

  it("bruker en ny id for hver oppføring", () => {
    const ctx = context(people.marte, "2026-11-17T09:00:00+01:00", "akt");
    const first = reviewFinishedActivity(q, "removed", people.ola, [], ctx);
    const second = reviewFinishedActivity(q, "removed", people.ola, [], ctx);
    expect(first.id).toBe("akt-1");
    expect(second.id).toBe("akt-2");
  });
});
