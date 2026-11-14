import { describe, expect, it } from "vitest";
import { features } from "../../app/features";
import { isMember } from "../../domain/knowledge-base/permissions";
import { personOf, seedState } from "../../domain/knowledge-base/testState";
import { knowledgeBaseFeature } from "./feature";

const state = seedState();

function cardFor(id: string) {
  return knowledgeBaseFeature.homeCard(personOf(state, id), state);
}

describe("knowledgeBaseFeature", () => {
  it("har id, navn og grunnsti", () => {
    expect(knowledgeBaseFeature.id).toBe("knowledgeBase");
    expect(knowledgeBaseFeature.label).toBe("Kunnskapsbank");
    expect(knowledgeBaseFeature.basePath).toBe("/kunnskapsbank");
  });

  it("gir medlemmer et kort om å spørre andre bedrifter", () => {
    for (const id of [
      "person-1",
      "person-2",
      "person-3",
      "person-5",
      "person-6",
    ]) {
      expect(cardFor(id), id).toEqual({
        title: "Spør andre bedrifter",
        text: "Still et spørsmål, eller finn svar fra bedrifter som har løst det samme før deg.",
        actionLabel: "Gå til kunnskapsbanken",
        route: "/kunnskapsbank",
      });
    }
  });

  it("gir administratorer et kort om kunnskapsbanken", () => {
    expect(cardFor("person-15")).toEqual({
      title: "Kunnskapsbanken",
      text: "Se hva medlemmene spør om, og vurder innhold som er flagget.",
      actionLabel: "Gå til kunnskapsbanken",
      route: "/kunnskapsbank",
    });
  });

  it("gir ikke noe kort til alle andre", () => {
    for (const id of ["person-4", "person-7", "person-8", "person-9"]) {
      expect(cardFor(id), id).toBe(null);
    }
  });

  it("har gruppen knowledgeBase.members lik isMember", () => {
    expect(Object.keys(knowledgeBaseFeature.audienceGroups)).toEqual([
      "knowledgeBase.members",
    ]);
    expect(knowledgeBaseFeature.audienceGroups["knowledgeBase.members"]).toBe(
      isMember,
    );
  });

  it("har ingen systemsteg", () => {
    expect(knowledgeBaseFeature.systemSteps).toEqual([]);
  });

  it("kommer etter marketplace i feature-listen", () => {
    const ids = features.map((feature) => feature.id);
    expect(ids).toEqual(["marketplace", "knowledgeBase"]);
  });

  it("har ett oppsett med sidene under kunnskapsbanken", () => {
    const layout = knowledgeBaseFeature.routes[0];
    expect(knowledgeBaseFeature.routes).toHaveLength(1);
    expect(layout?.children?.map((route) => route.path)).toEqual([
      "/kunnskapsbank",
      "/kunnskapsbank/tema/:topicId",
      "/kunnskapsbank/sporsmal/ny",
      "/kunnskapsbank/sporsmal/:questionId/rediger",
      "/kunnskapsbank/sporsmal/:questionId",
      "/kunnskapsbank/chatbot",
      "/kunnskapsbank/vurdering",
    ]);
  });
});
