import { expect, type Page } from "@playwright/test";

export const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

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

export async function openTab(page: Page, name: string) {
  if (isMobile(page)) {
    await page.getByRole("tab", { name, exact: true }).click();
  }
}
