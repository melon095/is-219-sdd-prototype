import { expect, type Page } from "@playwright/test";
import { switchUser } from "./helpers";

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
