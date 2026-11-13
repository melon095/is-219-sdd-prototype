import { expect, type Page } from "@playwright/test";

export const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export async function pickSkills(
  page: Page,
  comboboxName: string,
  skills: string[],
) {
  const picker = page.getByRole("combobox", { name: comboboxName });
  for (const skill of skills) {
    await picker.fill(skill);
    await page.getByRole("option", { name: skill, exact: true }).click();
    await expect(
      page.getByRole("row", { name: skill, exact: true }),
    ).toBeVisible();
    await expect(picker).toHaveValue("");
  }
  await expect(
    page.getByRole("grid", { name: /^Valgte/ }).getByRole("row"),
  ).toHaveCount(skills.length);
}

export async function typeDate(
  page: Page,
  day: number,
  month: number,
  year: number,
) {
  const digits = `${String(day).padStart(2, "0")}${String(month).padStart(2, "0")}${year}`;
  const segments = page.getByRole("spinbutton");
  await segments.first().click();
  await page.keyboard.type(digits);
  await expect(segments.nth(0)).toHaveText(String(day));
  await expect(segments.nth(1)).toHaveText(String(month));
  await expect(segments.nth(2)).toHaveText(String(year));
}

export async function clearSkills(page: Page) {
  const remove = page
    .getByRole("grid", { name: /^Valgte/ })
    .getByRole("button");
  let remaining = await remove.count();
  while (remaining > 0) {
    await remove.first().click();
    remaining -= 1;
    await expect(remove).toHaveCount(remaining);
  }
}

export function daysFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function isMobile(page: Page): boolean {
  const size = page.viewportSize();
  return size !== null && size.width < 768;
}

async function openControls(page: Page) {
  if (isMobile(page)) {
    await page.getByRole("button", { name: "Meny" }).click();
    await expect(page.getByRole("dialog", { name: "Meny" })).toBeVisible();
  }
}

async function closeControls(page: Page) {
  if (isMobile(page)) {
    await page.getByRole("button", { name: "Lukk meny" }).click();
    await expect(page.getByRole("dialog", { name: "Meny" })).toBeHidden();
  }
}

export async function switchUser(page: Page, name: string) {
  await openControls(page);
  await page.getByRole("button", { name: /Bytt bruker/ }).click();
  await page.getByRole("option", { name }).click();
  await expect(page.getByRole("listbox")).toBeHidden();
  await closeControls(page);
}

export async function pressFeatureLink(page: Page, name: string) {
  await openControls(page);
  const scope = isMobile(page)
    ? page.getByRole("dialog", { name: "Meny" })
    : page.getByRole("banner");
  await scope.getByRole("link", { name, exact: true }).click();
}

export async function openTab(page: Page, name: string) {
  if (isMobile(page)) {
    await page.getByRole("tab", { name, exact: true }).click();
  }
}
