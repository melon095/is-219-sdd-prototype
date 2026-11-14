import { screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import type { DemoState } from "../../../domain/frame/types";
import {
  flag,
  people,
  withKnowledgeBase,
} from "../../../domain/knowledge-base/testState";
import type { TargetKind } from "../../../domain/knowledge-base/types";
import { renderPage } from "../../marketplace/pages/renderPage";
import { formatDateTime } from "../format";
import { flagTimes, moderationState } from "../testFixtures";
import { FlagWarning } from "./FlagWarning";

function open(
  userId: string,
  targetKind: TargetKind,
  targetId: string,
  state: DemoState = moderationState(),
) {
  return renderPage(<FlagWarning target={{ targetKind, targetId }} />, {
    path: "test",
    route: "/test",
    userId,
    state,
  });
}

const answerWarning =
  "Dette innlegget er flagget (Utdatert, Feil) og blir vurdert av Varodd. Vær forsiktig med å stole på det.";

describe("FlagWarning", () => {
  it("er en advarsel som lister hver grunn i den åpne vurderingen", () => {
    const { container } = open(people.per, "answer", "svar-2");

    expect(screen.getByText(answerWarning)).toBeTruthy();
    expect(container.querySelector(".notice")?.getAttribute("data-tone")).toBe(
      "warning",
    );
  });

  it("lister hver grunn bare én gang", () => {
    const base = moderationState();
    const state = withKnowledgeBase(base, {
      flags: [
        ...base.knowledgeBase.flags,
        flag("flagg-5", "vurdering-2", "answer", "svar-2", {
          flaggedBy: people.per,
          reason: "outdated",
        }),
      ],
      reviews: base.knowledgeBase.reviews.map((item) =>
        item.id === "vurdering-2"
          ? { ...item, flagIds: [...item.flagIds, "flagg-5"] }
          : item,
      ),
    });
    open(people.anne, "answer", "svar-2", state);

    expect(screen.getByText(answerWarning)).toBeTruthy();
  });

  it("gjelder også et spørsmål", () => {
    open(people.kari, "question", "sporsmal-1");

    expect(
      screen.getByText(
        "Dette innlegget er flagget (Spam) og blir vurdert av Varodd. Vær forsiktig med å stole på det.",
      ),
    ).toBeTruthy();
  });

  it("viser forfatteren og andre medlemmer grunnene, men ikke hvem som flagget eller notatene", () => {
    for (const userId of [people.ola, people.per]) {
      const { unmount } = open(userId, "answer", "svar-2");
      expect(screen.getByText(answerWarning), userId).toBeTruthy();
      expect(screen.queryByRole("list"), userId).toBe(null);
      expect(screen.queryByText("Kari Nordmann"), userId).toBe(null);
      expect(screen.queryByText("Jonas Berg"), userId).toBe(null);
      expect(screen.queryByText("Prisen er feil."), userId).toBe(null);
      unmount();
    }
  });

  it("viser administratoren hvem som flagget, grunn, notat og tid", () => {
    open(people.marte, "answer", "svar-2");

    expect(screen.getByText(answerWarning)).toBeTruthy();
    const items = within(
      screen.getByRole("list", { name: "Hvem som har flagget" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(2);

    const first = within(items[0] as HTMLElement);
    expect(first.getByText("Kari Nordmann")).toBeTruthy();
    expect(first.getByText("Utdatert")).toBeTruthy();
    expect(
      first.getByText(formatDateTime(flagTimes.answerOutdated)),
    ).toBeTruthy();

    const second = within(items[1] as HTMLElement);
    expect(second.getByText("Jonas Berg")).toBeTruthy();
    expect(second.getByText("Feil")).toBeTruthy();
    expect(second.getByText("Prisen er feil.")).toBeTruthy();
    expect(
      second.getByText(formatDateTime(flagTimes.answerIncorrect)),
    ).toBeTruthy();
  });

  it("vises ikke for innhold som ikke er flagget eller er fjernet", () => {
    for (const targetId of ["svar-1", "svar-3", "sporsmal-2"]) {
      const kind = targetId.startsWith("svar") ? "answer" : "question";
      const { container, unmount } = open(people.marte, kind, targetId);
      expect(container.querySelector(".notice"), targetId).toBe(null);
      unmount();
    }
  });

  it("har ingen tilgjengelighetsfeil for medlem og administrator", async () => {
    const member = open(people.per, "answer", "svar-2");
    expect(await axe(member.container)).toHaveNoViolations();
    member.unmount();

    const admin = open(people.marte, "answer", "svar-2");
    expect(await axe(admin.container)).toHaveNoViolations();
  });
});
