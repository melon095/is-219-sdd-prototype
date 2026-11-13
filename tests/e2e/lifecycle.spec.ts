import { expect, type Page, test } from "@playwright/test";
import { openTab, switchUser } from "./helpers";

function statusBadge(page: Page, label: string) {
  return page.locator(".status-badge", { hasText: label });
}

function candidates(page: Page) {
  return page.getByRole("list", { name: "Kortliste" }).getByRole("listitem");
}

function logItems(page: Page) {
  return page.getByRole("list", { name: "Logg" }).getByRole("listitem");
}

test.describe("Fra avtale til fullført oppdrag", () => {
  test("eieren registrerer oppstart og markerer oppdraget som fullført med full logg", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Ola Dahl");
    await page.goto("/#/oppdrag/oppdrag-2");
    await expect(statusBadge(page, "Avtalt")).toBeVisible();

    await page.getByRole("button", { name: "Registrer oppstart" }).click();
    const startDialog = page.getByRole("dialog", {
      name: "Registrer oppstart",
    });
    await expect(startDialog).toBeVisible();
    await startDialog.getByRole("button", { name: "Registrer" }).click();
    await expect(statusBadge(page, "Pågår")).toBeVisible();

    await page.getByRole("button", { name: "Marker som fullført" }).click();
    const doneDialog = page.getByRole("dialog", {
      name: "Marker som fullført",
    });
    await expect(doneDialog).toBeVisible();
    await doneDialog.getByText("Ble fast ansettelse", { exact: true }).click();
    await doneDialog.getByRole("button", { name: "Fullfør oppdraget" }).click();
    await expect(statusBadge(page, "Fullført")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Marker som fullført" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Avlys" })).toHaveCount(0);

    await openTab(page, "Logg");
    const items = logItems(page);
    for (const text of [
      /publiserte oppdraget/,
      /ble lagt til på kortlisten/,
      /inviterte .* til intervju/,
      /ga .* et tilbud/,
      /godtok tilbudet/,
      /registrerte oppstart/,
      /markerte oppdraget som fullført/,
    ]) {
      await expect(items.filter({ hasText: text }).first()).toBeVisible();
    }
    const count = await items.count();
    for (let index = 0; index < count; index += 1) {
      const item = items.nth(index);
      await expect(item.locator("time")).toHaveCount(1);
      await expect(item.locator(".request-log-meta")).toContainText(
        /Ola Dahl|Omar Ali|System/,
      );
    }
    await expect(
      items
        .filter({
          has: page.locator(".request-log-meta", { hasText: "System" }),
        })
        .first(),
    ).toBeVisible();
  });

  test("den avtalte arbeideren trekker seg og blir ikke lagt til igjen", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Omar Ali");
    await page.goto("/#/oppdrag/oppdrag-2");
    await expect(statusBadge(page, "Avtalt")).toBeVisible();

    await page.getByRole("button", { name: "Trekk deg" }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog
      .getByRole("button", { name: "Trekk deg fra oppdraget" })
      .click();
    await expect(
      page.getByText(
        "Dette oppdraget er ikke lenger åpent for deg. Vi gir deg beskjed når vi finner nye oppdrag som passer deg.",
      ),
    ).toBeVisible();

    await switchUser(page, "Ola Dahl");
    await page.goto("/#/oppdrag/oppdrag-2");
    await expect(statusBadge(page, "Kortliste klar")).toBeVisible();
    await expect(candidates(page).filter({ hasText: "Omar Ali" })).toHaveCount(
      0,
    );
    await expect(
      candidates(page).filter({ hasText: "Henrik Larsen" }),
    ).toHaveCount(1);
  });

  test("administratoren avlyser et oppdrag med en begrunnelse", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Marte Vik");
    await page.goto("/#/oppdrag/oppdrag-4");
    await expect(statusBadge(page, "Kortliste klar")).toBeVisible();

    await page.getByRole("button", { name: "Avlys" }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog
      .getByRole("textbox", { name: "Hvorfor avlyses oppdraget?" })
      .fill("Oppdraget er ikke lenger aktuelt.");
    await dialog.getByRole("button", { name: "Avlys oppdraget" }).click();

    await expect(statusBadge(page, "Avlyst")).toBeVisible();
    await expect(page.getByRole("button", { name: "Avlys" })).toHaveCount(0);
  });

  test("administratoren ser alle samtalene og hele loggen på et oppdrag", async ({
    page,
  }) => {
    await page.goto("/");
    await switchUser(page, "Marte Vik");
    await page.goto("/#/oppdrag/oppdrag-4");
    await expect(candidates(page)).toHaveCount(3);

    await openTab(page, "Meldinger");
    await expect(
      page.getByRole("tablist", { name: "Samtaler" }).getByRole("tab"),
    ).toHaveText([
      "Kari Nordmann og Amina Yusuf",
      "Kari Nordmann og Lena Eriksen",
      "Kari Nordmann og Mats Johansen",
    ]);
    await expect(
      page.getByText("Du kan lese, men ikke skrive i denne samtalen"),
    ).toBeVisible();

    await openTab(page, "Logg");
    const items = logItems(page);
    await expect(items.filter({ hasText: /publiserte oppdraget/ })).toHaveCount(
      1,
    );
    for (const name of ["Amina Yusuf", "Lena Eriksen", "Mats Johansen"]) {
      await expect(
        items.filter({ hasText: `${name} ble lagt til på kortlisten` }),
      ).toHaveCount(1);
    }
  });
});
