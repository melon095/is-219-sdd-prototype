import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { axeTags, openTab, switchUser } from "./helpers";

const translateTitle = "Oversette produktbeskrivelser til engelsk";
const launchTitle = "Lansere ny nettbutikk med kampanje";
const noLongerOpen =
  "Dette oppdraget er ikke lenger åpent for deg. Vi gir deg beskjed når vi finner nye oppdrag som passer deg.";

function candidates(page: Page) {
  return page.getByRole("list", { name: "Kortliste" }).getByRole("listitem");
}

function statusBadge(page: Page, label: string) {
  return page.locator(".status-badge", { hasText: label });
}

function todayDigits(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${day}${month}${today.getFullYear()}`;
}

async function registerProfile(page: Page, skills: string[]) {
  for (const skill of skills) {
    await page.getByRole("combobox", { name: "Ferdigheter" }).fill(skill);
    await page.getByRole("option", { name: skill, exact: true }).click();
  }
  await page.getByText("Erfaren", { exact: true }).click();
  await page.getByRole("spinbutton").first().click();
  await page.keyboard.type(todayDigits());
  await page.getByRole("button", { name: "Registrer profilen" }).click();
}

async function referThroughNav(page: Page, name: string) {
  await switchUser(page, "Marte Vik");
  await page.goto("/#/admin");
  const section = page.getByRole("region", { name: "Simulert NAV-henvisning" });
  const item = section.getByRole("listitem").filter({ hasText: name });
  await item.getByRole("button", { name: "Henvis fra NAV (simulert)" }).click();
  await expect(item).toHaveCount(0);
}

test.describe("Arbeidssøkeren registrerer seg og blir matchet", () => {
  test("arbeideren ser åpne oppdrag, Dine oppdrag og at en ikke kan søke direkte", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Mats Johansen");
    await page.goto("/#/oppdrag");

    await expect(
      page.getByRole("heading", { level: 1, name: "Oppdrag" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: translateTitle }),
    ).toBeVisible();
    const mine = page.getByRole("region", { name: "Dine oppdrag" });
    await expect(
      mine.getByRole("link", {
        name: "Innhold og sosiale medier til julesalget",
      }),
    ).toBeVisible();
    await expect(mine.getByRole("link", { name: launchTitle })).toBeVisible();
    await expect(
      mine.getByRole("link", { name: "Oppdatere nettsiden med nye produkter" }),
    ).toBeVisible();
    await expect(
      page.getByText("Du kan ikke søke direkte; vi matcher deg automatisk"),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("button", { name: /søk/i }),
    ).toHaveCount(0);
  });

  test("en person uten profil registrerer seg og står på kortlisten til et åpent oppdrag", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Thea Bakke");
    await page.goto("/#/profil");
    await expect(
      page.getByRole("heading", { level: 1, name: "Min profil" }),
    ).toBeVisible();

    await registerProfile(page, ["Oversettelse til engelsk", "Tekstskriving"]);

    await expect(page.getByRole("button", { name: "Rediger" })).toBeVisible();
    await expect(
      page
        .getByRole("list", { name: "Kortlister og tilbud" })
        .getByRole("link", { name: translateTitle }),
    ).toBeVisible();

    await switchUser(page, "Ingrid Solberg");
    await page.goto("/#/oppdrag/oppdrag-7");
    await expect(
      page.getByRole("heading", { level: 1, name: translateTitle }),
    ).toBeVisible();
    await expect(statusBadge(page, "Kortliste klar")).toBeVisible();
    await expect(
      candidates(page).filter({ hasText: "Thea Bakke" }),
    ).toHaveCount(1);
  });

  test("administratoren henviser via NAV, personen fullfører utkastet og blir matchet", async ({
    page,
  }) => {
    await page.goto("/");
    await referThroughNav(page, "Sander Haugen");

    await switchUser(page, "Sander Haugen");
    await page.goto("/#/profil");
    await expect(
      page.getByText(
        "Du er henvist fra NAV (simulert). Fyll ut profilen din for å bli med i matchingen",
      ),
    ).toBeVisible();

    await registerProfile(page, ["Oversettelse til engelsk", "Tekstskriving"]);

    await expect(page.getByRole("button", { name: "Rediger" })).toBeVisible();
    await page.goto("/#/oppdrag");
    await expect(
      page
        .getByRole("region", { name: "Dine oppdrag" })
        .getByRole("link", { name: translateTitle }),
    ).toBeVisible();
  });
});

test.describe("Tilbud som utløper eller avslås", () => {
  test("tidsknappen får tilbudet til å utløpe, neste arbeider legges til og ingen andre oppdrag endres", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Anne Lie");
    await page.goto("/#/oppdrag/oppdrag-5");
    await expect(
      page.getByRole("heading", { level: 1, name: launchTitle }),
    ).toBeVisible();
    await expect(statusBadge(page, "Tilbud sendt")).toBeVisible();

    await page
      .getByRole("button", { name: "Demo: Simuler at 7 dager har gått" })
      .click();

    await expect(statusBadge(page, "Kortliste klar")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Demo: Simuler at 7 dager har gått" }),
    ).toHaveCount(0);
    await expect(candidates(page)).toHaveCount(3);
    await expect(
      candidates(page).filter({ hasText: "Mats Johansen" }),
    ).toHaveCount(0);
    await expect(
      candidates(page).filter({ hasText: "Lena Eriksen" }),
    ).toHaveCount(1);
    await openTab(page, "Logg");
    const log = page.getByRole("list", { name: "Logg" });
    await expect(
      log.getByText(/Simulert med feilsøkingsknappen/),
    ).toBeVisible();
    await expect(log.locator(".simulated-label")).toHaveCount(1);

    await switchUser(page, "Marte Vik");
    await page.goto("/#/oppdrag/oppdrag-4");
    await expect(statusBadge(page, "Kortliste klar")).toBeVisible();
    await expect(candidates(page)).toHaveCount(3);
    await page.goto("/#/oppdrag/oppdrag-8");
    await expect(statusBadge(page, "Kortliste klar")).toBeVisible();
    await expect(candidates(page)).toHaveCount(2);
  });

  test("arbeideren avslår et tilbud og ser siden uten tilgang til detaljene fra aktivitetsstrømmen", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Mats Johansen");
    await page.goto("/#/oppdrag/oppdrag-5");
    await expect(statusBadge(page, "Tilbud sendt")).toBeVisible();

    await page.getByRole("button", { name: "Avslå" }).click();
    await expect(page.getByText(noLongerOpen)).toBeVisible();

    await switchUser(page, "Anne Lie");
    await page.goto("/#/oppdrag/oppdrag-5");
    await expect(statusBadge(page, "Kortliste klar")).toBeVisible();
    await expect(
      candidates(page).filter({ hasText: "Mats Johansen" }),
    ).toHaveCount(0);

    await switchUser(page, "Mats Johansen");
    await page.goto("/#/");
    const feed = page.getByRole("region", { name: "Siste aktivitet" });
    await feed
      .getByRole("link", { name: /tilbud.*Lansere ny nettbutikk/i })
      .first()
      .click();

    await expect(
      page.getByRole("heading", { level: 1, name: launchTitle }),
    ).toBeVisible();
    await expect(page.getByText(noLongerOpen)).toBeVisible();
    await expect(
      page.getByText("Du har ikke tilgang til denne siden"),
    ).toHaveCount(0);
  });
});

test.describe("Tilgjengelighet på profilsiden", () => {
  test("/profil har ingen tilgjengelighetsfeil uten profil, med NAV-utkast og med ferdig profil", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Thea Bakke");
    await page.goto("/#/profil");
    await expect(
      page.getByRole("combobox", { name: "Ferdigheter" }),
    ).toBeVisible();
    const empty = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(empty.violations).toEqual([]);

    await referThroughNav(page, "Sander Haugen");
    await switchUser(page, "Sander Haugen");
    await page.goto("/#/profil");
    await expect(
      page.getByText(/Du er henvist fra NAV \(simulert\)/),
    ).toBeVisible();
    const draft = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(draft.violations).toEqual([]);

    await switchUser(page, "Mats Johansen");
    await page.goto("/#/profil");
    await expect(page.getByRole("button", { name: "Rediger" })).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Kortlister og tilbud" }),
    ).toBeVisible();
    const complete = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(complete.violations).toEqual([]);
  });
});
