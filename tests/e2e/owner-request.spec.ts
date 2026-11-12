import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { axeTags, openTab, switchUser } from "./helpers";

type NewRequest = {
  title: string;
  skills: string[];
  durationAmount: string;
  expectNotice?: boolean;
};

const durationNotice =
  "Varigheten er utenfor det vanlige (2 uker til 6 måneder). Du kan fortsatt publisere oppdraget.";

function candidates(page: Page) {
  return page.getByRole("list", { name: "Kortliste" }).getByRole("listitem");
}

function candidate(page: Page, name: string) {
  return candidates(page).filter({ hasText: name });
}

function statusBadge(page: Page, label: string) {
  return page.locator(".status-badge", { hasText: label });
}

async function fillAndPublish(page: Page, request: NewRequest) {
  await page.goto("/#/oppdrag");
  await page.getByRole("button", { name: "Nytt oppdrag" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Nytt oppdrag" }),
  ).toBeVisible();

  await page.getByRole("textbox", { name: "Tittel" }).fill(request.title);
  await page
    .getByRole("textbox", { name: "Beskrivelse" })
    .fill("Vi trenger hjelp med innhold og kampanjer i vinter.");
  for (const skill of request.skills) {
    const picker = page.getByRole("combobox", {
      name: "Nødvendige ferdigheter",
    });
    await picker.fill(skill);
    await page.getByRole("option", { name: skill, exact: true }).click();
  }
  await page
    .getByRole("textbox", { name: "Tilleggskrav (valgfritt)" })
    .fill("Gjerne erfaring fra små nettbutikker.");
  await page.getByRole("spinbutton").first().click();
  await page.keyboard.type("15012027");
  await page
    .getByRole("textbox", { name: "Varighet" })
    .fill(request.durationAmount);
  await page.keyboard.press("Tab");
  if (request.expectNotice === true) {
    await expect(page.getByText(durationNotice)).toBeVisible();
  }
  await page.getByRole("textbox", { name: "Timer per uke" }).fill("10");
  await page.keyboard.press("Tab");
  await page.getByText("Fjernarbeid", { exact: true }).click();
  await page.getByRole("button", { name: "Publiser oppdraget" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: request.title }),
  ).toBeVisible();
  const match = page.url().match(/#\/oppdrag\/(.+)$/);
  if (match === null || match[1] === undefined) {
    throw new Error(`Uventet adresse etter publisering: ${page.url()}`);
  }
  return match[1];
}

async function sendMessage(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Skriv en melding" }).fill(text);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(text, { exact: true })).toBeVisible();
}

test.describe("Eier ber om hjelp og velger en arbeider", () => {
  test("eieren publiserer et oppdrag og får en rangert kortliste", async ({
    page,
  }) => {
    const started = Date.now();
    await page.goto("/");

    await fillAndPublish(page, {
      title: "Hjelp med innhold til vinterkampanjen",
      skills: ["Sosiale medier", "Innholdsproduksjon"],
      durationAmount: "6",
    });

    await expect(statusBadge(page, "Kortliste klar")).toBeVisible();
    await expect(candidates(page)).toHaveCount(3);
    await expect(candidates(page).first()).toContainText("Nr. 1");
    expect(Date.now() - started).toBeLessThan(120_000);
  });

  test("aktivitetsstrømmen vises riktig for eier, kandidat og en uten tilknytning", async ({
    page,
  }) => {
    await page.goto("/");
    const id = await fillAndPublish(page, {
      title: "Hjelp med innhold til vinterkampanjen",
      skills: ["Sosiale medier", "Innholdsproduksjon"],
      durationAmount: "6",
    });
    const feed = page.getByRole("region", { name: "Siste aktivitet" });
    const entryFor = (text: RegExp) =>
      feed.locator(`a[href$="/oppdrag/${id}"]`).filter({ hasText: text });

    await page.goto("/#/");
    await expect(entryFor(/kortliste/)).toHaveCount(1);
    await expect(entryFor(/Nytt oppdrag/)).toHaveCount(1);

    await switchUser(page, "Amina Yusuf");
    await expect(entryFor(/kortliste/)).toHaveCount(1);
    await expect(entryFor(/Nytt oppdrag/)).toHaveCount(1);

    await switchUser(page, "Henrik Larsen");
    await expect(entryFor(/Nytt oppdrag/)).toHaveCount(1);
    await expect(entryFor(/kortliste/)).toHaveCount(0);

    await entryFor(/Nytt oppdrag/).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Hjelp med innhold til vinterkampanjen",
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#/oppdrag/${id}$`));
  });

  test("en varighet på én uke viser merknaden og blir likevel publisert", async ({
    page,
  }) => {
    await page.goto("/");

    await fillAndPublish(page, {
      title: "Rask hjelp med bilder",
      skills: ["Produktfotografering"],
      durationAmount: "1",
      expectNotice: true,
    });

    await expect(page.getByText(durationNotice)).toBeVisible();
    await expect(statusBadge(page, "Kortliste klar")).toBeVisible();
  });

  test("de seede oppdragene viser full kortliste, kort kortliste og ingen kandidater", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Marte Vik");

    await page.goto("/#/oppdrag/oppdrag-4");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Innhold og sosiale medier til julesalget",
      }),
    ).toBeVisible();
    await expect(candidates(page)).toHaveCount(3);

    await page.goto("/#/oppdrag/oppdrag-6");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Nye bilder av honningproduktene",
      }),
    ).toBeVisible();
    await expect(candidates(page)).toHaveCount(2);

    await page.goto("/#/oppdrag/oppdrag-7");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Oversette produktbeskrivelser til engelsk",
      }),
    ).toBeVisible();
    await expect(statusBadge(page, "Åpen")).toBeVisible();
    await expect(candidates(page)).toHaveCount(0);
  });

  test("intervju, meldinger og tilbud, og en annen kandidat ser ikke samtalen", async ({
    page,
  }) => {
    await page.goto("/#/oppdrag/oppdrag-4");
    await expect(candidates(page)).toHaveCount(3);

    await candidate(page, "Lena Eriksen")
      .getByRole("button", { name: "Inviter til intervju" })
      .click();
    await expect(candidate(page, "Lena Eriksen")).toContainText(
      "Invitert til intervju",
    );
    await expect(statusBadge(page, "Kortliste klar")).toBeVisible();

    await openTab(page, "Meldinger");
    await page.getByRole("tab", { name: "Lena Eriksen" }).click();
    const fromOwner = "Hei Lena! Har du tid til en prat torsdag?";
    await sendMessage(page, fromOwner);

    await switchUser(page, "Lena Eriksen");
    await openTab(page, "Meldinger");
    await expect(page.getByText(fromOwner, { exact: true })).toBeVisible();
    const fromWorker = "Hei Kari! Torsdag passer fint.";
    await sendMessage(page, fromWorker);

    await switchUser(page, "Kari Nordmann");
    await openTab(page, "Kortliste");
    await candidate(page, "Lena Eriksen")
      .getByRole("button", { name: "Gi tilbud" })
      .click();
    await expect(statusBadge(page, "Tilbud sendt")).toBeVisible();

    await switchUser(page, "Mats Johansen");
    await openTab(page, "Meldinger");
    await expect(
      page.getByRole("tablist", { name: "Samtaler" }).getByRole("tab"),
    ).toHaveText(["Kari Nordmann"]);
    await expect(page.getByText(fromOwner, { exact: true })).toHaveCount(0);
    await expect(page.getByText(fromWorker, { exact: true })).toHaveCount(0);
  });

  test("arbeideren godtar tilbudet og oppdraget blir avtalt", async ({
    page,
  }) => {
    await page.goto("/#/oppdrag/oppdrag-5");
    await switchUser(page, "Mats Johansen");

    await expect(statusBadge(page, "Tilbud sendt")).toBeVisible();
    await page.getByRole("button", { name: "Godta" }).click();

    await expect(statusBadge(page, "Avtalt")).toBeVisible();
    await expect(page.getByRole("button", { name: "Godta" })).toHaveCount(0);
  });

  test("eieren avviser kortlisten, administratoren åpner igjen og de avviste kommer ikke tilbake", async ({
    page,
  }) => {
    await page.goto("/#/oppdrag/oppdrag-8");
    await expect(candidates(page)).toHaveCount(2);

    await page.getByRole("button", { name: "Avvis hele kortlisten" }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog
      .getByRole("textbox", { name: "Hvorfor passer ingen av disse?" })
      .fill("Ingen av dem kjenner keramikkbransjen.");
    await dialog.getByRole("button", { name: "Avvis kortlisten" }).click();
    await expect(statusBadge(page, "Til vurdering")).toBeVisible();

    await switchUser(page, "Marte Vik");
    await page.goto("/#/admin");
    const item = page
      .getByRole("listitem")
      .filter({ hasText: "Oppdatere nettsiden med nye produkter" });
    await expect(item).toContainText("Ingen av dem kjenner keramikkbransjen.");
    await item.getByRole("button", { name: "Gjør åpen igjen" }).click();
    await expect(item).toHaveCount(0);

    await page.goto("/#/oppdrag/oppdrag-8");
    await expect(statusBadge(page, "Åpen")).toBeVisible();
    await expect(candidates(page)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 3, name: "Mats Johansen" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 3, name: "Henrik Larsen" }),
    ).toHaveCount(0);
  });

  test("åpne lister og kalenderen i skjemaet har ingen tilgjengelighetsfeil", async ({
    page,
  }) => {
    await page.goto("/#/oppdrag/ny");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nytt oppdrag" }),
    ).toBeVisible();
    const popover = page.locator(".react-aria-Popover");

    await page.getByRole("button", { name: /Enhet/ }).click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(popover).not.toHaveAttribute("data-entering");
    const select = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(select.violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(popover).toHaveCount(0);

    await page.getByRole("button", { name: /Kalender/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(popover).not.toHaveAttribute("data-entering");
    const calendar = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(calendar.violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(popover).toHaveCount(0);

    await page
      .getByRole("combobox", { name: "Nødvendige ferdigheter" })
      .fill("S");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(popover).not.toHaveAttribute("data-entering");
    const skills = await new AxeBuilder({ page })
      .include(".react-aria-Popover")
      .withTags(axeTags)
      .analyze();
    expect(skills.violations).toEqual([]);
  });

  test("sidene har ingen tilgjengelighetsfeil", async ({ page }) => {
    await page.goto("/#/oppdrag");
    await expect(
      page.getByRole("heading", { level: 1, name: "Oppdrag" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Innhold og sosiale medier/ }).first(),
    ).toBeVisible();
    const list = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(list.violations).toEqual([]);

    await page.goto("/#/oppdrag/ny");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nytt oppdrag" }),
    ).toBeVisible();
    const form = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(form.violations).toEqual([]);

    await page.goto("/#/oppdrag/oppdrag-4");
    await expect(candidates(page)).toHaveCount(3);
    const request = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(request.violations).toEqual([]);

    await switchUser(page, "Marte Vik");
    await page.goto("/#/admin");
    await expect(
      page.getByRole("heading", { level: 1, name: "Varodd-verktøy" }),
    ).toBeVisible();
    const admin = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(admin.violations).toEqual([]);
  });
});
