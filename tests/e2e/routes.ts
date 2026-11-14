import { expect, type Page } from "@playwright/test";
import { askQuestion, questionRegion, switchUser } from "./helpers";

export type Visit = { path: string; heading: string | RegExp };

export type Group = {
  name: string;
  user: string;
  prepare?: (page: Page) => Promise<void>;
  visits: Visit[];
};

const titles = {
  underReview: "Markedsføring av vinterkolleksjonen",
  agreed: "Hjelp med pakking og sending før jul",
  shortlisted: "Innhold og sosiale medier til julesalget",
  offered: "Lansere ny nettbutikk med kampanje",
  open: "Oversette produktbeskrivelser til engelsk",
  inProgress: "Video og annonser til vinterkolleksjonen",
  completed: "Annonser og synlighet for kaffeabonnementet",
  cancelled: "Julevideo til nettbutikken",
  kbOpen: "Hvordan lager jeg et kaffeabonnement i nettbutikken?",
  kbFlagged: "Hvordan holder jeg orden på regnskapet som enkeltpersonforetak?",
};

async function referThroughNav(page: Page) {
  await switchUser(page, "Marte Vik");
  await page.goto("/#/admin");
  const section = page.getByRole("region", { name: "Simulert NAV-henvisning" });
  const item = section
    .getByRole("listitem")
    .filter({ hasText: "Sander Haugen" });
  await item.getByRole("button", { name: "Henvis fra NAV (simulert)" }).click();
  await expect(item).toHaveCount(0);
}

let removedQuestionPath = "/kunnskapsbank";

async function removeQuestionThroughForum(page: Page) {
  await switchUser(page, "Jonas Berg");
  await askQuestion(page, {
    title: "Hvordan sender vi pakker med zeppelin?",
    description: "Vi vurderer zeppelin for store ordrer og lurer på prisene.",
    topic: "Nettbutikk",
  });
  removedQuestionPath = new URL(page.url()).hash.slice(1);
  await switchUser(page, "Per Hansen");
  const question = questionRegion(page);
  await question.getByRole("button", { name: "Flagg" }).click();
  const flagDialog = page.getByRole("dialog", { name: "Flagg innlegget" });
  await flagDialog.getByText("Spam", { exact: true }).click();
  await flagDialog.getByRole("button", { name: "Send" }).click();
  await expect(flagDialog).toBeHidden();
  await switchUser(page, "Marte Vik");
  await question.getByRole("button", { name: "Fjern" }).click();
  const confirm = page.getByRole("alertdialog");
  await confirm.getByRole("button", { name: "Fjern" }).click();
  await expect(confirm).toBeHidden();
  await expect(
    page.getByRole("heading", { level: 1, name: "Spørsmålet er fjernet" }),
  ).toBeVisible();
}

export const groups: Group[] = [
  {
    name: "eier med oppdrag som er kortlistet og avlyst",
    user: "Kari Nordmann",
    visits: [
      { path: "/", heading: /^Hei, Kari!$/ },
      { path: "/finnes-ikke", heading: "Siden finnes ikke" },
      { path: "/oppdrag", heading: "Oppdrag" },
      { path: "/oppdrag/ny", heading: "Nytt oppdrag" },
      { path: "/oppdrag/oppdrag-4", heading: titles.shortlisted },
      { path: "/oppdrag/oppdrag-13", heading: titles.cancelled },
      { path: "/oppdrag/oppdrag-4/rediger", heading: "Rediger oppdrag" },
      { path: "/bedrift", heading: "Min bedrift" },
      { path: "/profil", heading: "Min profil" },
    ],
  },
  {
    name: "eier med oppdrag som er tilbudt, pågår og er til vurdering",
    user: "Anne Lie",
    visits: [
      { path: "/oppdrag/oppdrag-5", heading: titles.offered },
      { path: "/oppdrag/oppdrag-11", heading: titles.inProgress },
      { path: "/oppdrag/oppdrag-1", heading: titles.underReview },
    ],
  },
  {
    name: "eier med oppdrag som er avtalt og fullført",
    user: "Ola Dahl",
    visits: [
      { path: "/oppdrag/oppdrag-2", heading: titles.agreed },
      { path: "/oppdrag/oppdrag-12", heading: titles.completed },
    ],
  },
  {
    name: "eier med et åpent oppdrag som kan redigeres",
    user: "Ingrid Solberg",
    visits: [
      { path: "/oppdrag/oppdrag-7", heading: titles.open },
      { path: "/oppdrag/oppdrag-7/rediger", heading: "Rediger oppdrag" },
    ],
  },
  {
    name: "ansatt som ikke er eier",
    user: "Jonas Berg",
    visits: [
      { path: "/oppdrag", heading: "Oppdrag" },
      { path: "/bedrift", heading: "Min bedrift" },
    ],
  },
  {
    name: "administrator",
    user: "Marte Vik",
    visits: [
      { path: "/oppdrag", heading: "Oppdrag" },
      { path: "/admin", heading: "Varodd-verktøy" },
      { path: "/oppdrag/oppdrag-1", heading: titles.underReview },
      { path: "/oppdrag/oppdrag-2", heading: titles.agreed },
      { path: "/oppdrag/oppdrag-4", heading: titles.shortlisted },
      { path: "/oppdrag/oppdrag-5", heading: titles.offered },
      { path: "/oppdrag/oppdrag-7", heading: titles.open },
      { path: "/oppdrag/oppdrag-11", heading: titles.inProgress },
      { path: "/oppdrag/oppdrag-12", heading: titles.completed },
      { path: "/oppdrag/oppdrag-13", heading: titles.cancelled },
    ],
  },
  {
    name: "arbeidssøker med profil og tilbud",
    user: "Mats Johansen",
    visits: [
      { path: "/oppdrag", heading: "Oppdrag" },
      { path: "/oppdrag/oppdrag-5", heading: titles.offered },
      { path: "/oppdrag/oppdrag-1", heading: titles.underReview },
      { path: "/oppdrag/ny", heading: "Du har ikke tilgang til denne siden" },
      { path: "/profil", heading: "Min profil" },
    ],
  },
  {
    name: "arbeidssøker uten profil",
    user: "Thea Bakke",
    visits: [
      { path: "/profil", heading: "Min profil" },
      { path: "/oppdrag", heading: "Oppdrag" },
    ],
  },
  {
    name: "arbeidssøker med NAV-utkast",
    user: "Sander Haugen",
    prepare: referThroughNav,
    visits: [{ path: "/profil", heading: "Min profil" }],
  },
  {
    name: "medlem i kunnskapsbanken",
    user: "Kari Nordmann",
    visits: [
      { path: "/kunnskapsbank", heading: "Kunnskapsbank" },
      { path: "/kunnskapsbank?sok=Mailchimp", heading: "Kunnskapsbank" },
      { path: "/kunnskapsbank/tema/tema-1", heading: "Nettbutikk" },
      { path: "/kunnskapsbank/sporsmal/ny", heading: "Still et spørsmål" },
      { path: "/kunnskapsbank/sporsmal/sporsmal-7", heading: titles.kbOpen },
      {
        path: "/kunnskapsbank/sporsmal/sporsmal-10",
        heading: titles.kbFlagged,
      },
      {
        path: "/kunnskapsbank/sporsmal/sporsmal-3/rediger",
        heading: "Rediger spørsmål",
      },
      { path: "/kunnskapsbank/chatbot", heading: "Spør chatboten" },
    ],
  },
  {
    name: "ikke-medlem i kunnskapsbanken",
    user: "Anne Lie",
    visits: [
      {
        path: "/kunnskapsbank",
        heading: "Kunnskapsbanken er for E-Waves-medlemmer",
      },
    ],
  },
  {
    name: "administrator i kunnskapsbanken",
    user: "Marte Vik",
    visits: [
      { path: "/kunnskapsbank", heading: "Kunnskapsbank" },
      { path: "/kunnskapsbank/vurdering", heading: "Til vurdering" },
    ],
  },
  {
    name: "administrator med et fjernet spørsmål",
    user: "Marte Vik",
    prepare: removeQuestionThroughForum,
    visits: [
      {
        get path() {
          return removedQuestionPath;
        },
        heading: "Spørsmålet er fjernet",
      },
    ],
  },
];

export async function openVisit(page: Page, visit: Visit) {
  await page.goto(`/#${visit.path}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    visit.heading,
  );
}

export async function startAs(page: Page, group: Group) {
  await page.goto("/");
  if (group.prepare !== undefined) {
    await group.prepare(page);
  }
  await switchUser(page, group.user);
}

const requestTabs = ["Kortliste", "Meldinger", "Logg"];

export async function eachMobileTab(
  page: Page,
  action: (label: string) => Promise<void>,
) {
  if (!/^\/oppdrag\/oppdrag-\d+$/.test(new URL(page.url()).hash.slice(1))) {
    return;
  }
  for (const name of requestTabs) {
    const tab = page.getByRole("tab", { name, exact: true });
    if ((await tab.count()) === 0) {
      continue;
    }
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await action(name);
  }
}
