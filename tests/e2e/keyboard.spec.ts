import { expect, type Locator, type Page, test } from "@playwright/test";
import { daysFromToday } from "./helpers";

async function describeFocus(page: Page): Promise<string> {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (element === null) {
      return "ingenting";
    }
    const role = element.getAttribute("role");
    const label =
      element.getAttribute("aria-label") ??
      element.textContent?.trim().slice(0, 40) ??
      "";
    return `${element.tagName.toLowerCase()}${role === null ? "" : `[${role}]`} «${label}»`;
  });
}

async function expectFocusVisible(page: Page) {
  const where = await describeFocus(page);
  const box = await page.evaluate(() => {
    const element = document.activeElement;
    if (element === null || element === document.body) {
      return null;
    }
    let target: Element = element;
    let candidate = element.parentElement;
    while (candidate !== null && candidate !== document.body) {
      const size = candidate.getBoundingClientRect();
      if (size.width > 0 && size.height > 0) {
        target = candidate;
        break;
      }
      candidate = candidate.parentElement;
    }
    const rect = target.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  expect(box, `Fokus er ikke på noe element (${where})`).not.toBeNull();
  if (box === null) {
    return;
  }
  const viewport = page.viewportSize();
  const padding = 8;
  const left = Math.max(0, Math.floor(box.x - padding));
  const top = Math.max(0, Math.floor(box.y - padding));
  const right = Math.min(
    viewport?.width ?? left + 1,
    Math.ceil(box.x + box.width + padding),
  );
  const bottom = Math.min(
    viewport?.height ?? top + 1,
    Math.ceil(box.y + box.height + padding),
  );
  const clip = {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
  const focused = await page.screenshot({ clip, animations: "disabled" });
  const handle = await page.evaluateHandle(
    () => document.activeElement as HTMLElement,
  );
  await page.evaluate(() => {
    const sink = document.createElement("button");
    sink.id = "fokus-sink";
    sink.style.cssText = "position:fixed;left:-9999px;top:0;outline:none";
    const host =
      document.activeElement?.closest("[role=dialog],[role=alertdialog]") ??
      document.body;
    host.append(sink);
    sink.focus();
  });
  const unfocused = await page.screenshot({ clip, animations: "disabled" });
  await page.evaluate(() => document.getElementById("fokus-sink")?.remove());
  await handle.evaluate((element) => element.focus());
  expect(
    Buffer.compare(focused, unfocused),
    `Fokus er ikke synlig på ${where}`,
  ).not.toBe(0);
}

async function isFocused(target: Locator): Promise<boolean> {
  if ((await target.count()) === 0) {
    return false;
  }
  return target
    .first()
    .evaluate((element) => element === document.activeElement);
}

async function tabTo(page: Page, target: Locator, maxPresses = 120) {
  for (let presses = 0; presses < maxPresses; presses += 1) {
    if (await isFocused(target)) {
      await expectFocusVisible(page);
      return;
    }
    await page.keyboard.press("Tab");
    const onBody = await page.evaluate(
      () => document.activeElement === document.body,
    );
    if (!onBody) {
      await expectFocusVisible(page);
    }
  }
  throw new Error(
    `Kom ikke til ${target} med Tab. Fokus er på ${await describeFocus(page)}`,
  );
}

async function expectFocusKept(page: Page) {
  const where = await describeFocus(page);
  const lost = await page.evaluate(
    () =>
      document.activeElement === null ||
      document.activeElement === document.body,
  );
  expect(lost, `Fokus ble borte (${where})`).toBe(false);
}

async function tabThroughPage(page: Page, maxPresses = 150) {
  const regions = new Set<string>();
  let stops = 0;
  await page.evaluate(() => {
    for (const element of document.querySelectorAll("[data-kbd-stop]")) {
      element.removeAttribute("data-kbd-stop");
    }
  });
  for (let presses = 0; presses < maxPresses; presses += 1) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const element = document.activeElement;
      if (element === null || element === document.body) {
        return { done: true, repeated: false, region: "" };
      }
      const repeated = element.hasAttribute("data-kbd-stop");
      element.setAttribute("data-kbd-stop", "true");
      const region = element.closest("header, main, footer, [role=dialog]");
      return {
        done: false,
        repeated,
        region: region === null ? "annet" : region.tagName.toLowerCase(),
      };
    });
    if (stop.done || stop.repeated) {
      expect(stops, "Tab kom seg gjennom hele siden").toBeGreaterThan(3);
      expect([...regions]).toEqual(expect.arrayContaining(["header", "main"]));
      return;
    }
    stops += 1;
    regions.add(stop.region);
    await expectFocusVisible(page);
  }
  throw new Error(
    `Tab kom ikke gjennom siden på ${maxPresses} trykk. Fokus er på ${await describeFocus(page)}`,
  );
}

async function expectTrappedIn(page: Page, dialog: Locator) {
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let presses = 0; presses < 8; presses += 1) {
      await page.keyboard.press(key);
      const inside = await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      );
      expect(inside, `Fokus forlot dialogen med ${key}`).toBe(true);
    }
  }
}

async function selectUserByKeyboard(page: Page, name: string) {
  const trigger = page.getByRole("button", { name: /Bytt bruker/ });
  await tabTo(page, trigger);
  await page.keyboard.press("Enter");
  const option = page.getByRole("option", { name });
  await expect(option).toBeVisible();
  const rows = await page.getByRole("option").evaluateAll((elements) =>
    elements.map((element) => ({
      focused: element.hasAttribute("data-focused"),
      text: element.textContent ?? "",
    })),
  );
  const from = rows.findIndex((row) => row.focused);
  const to = rows.findIndex((row) => row.text.startsWith(name));
  expect(from, "Ingen alternativer har fokus i listen").toBeGreaterThanOrEqual(
    0,
  );
  expect(to, `Fant ikke ${name} i listen`).toBeGreaterThanOrEqual(0);
  const key = to > from ? "ArrowDown" : "ArrowUp";
  for (let presses = 0; presses < Math.abs(to - from); presses += 1) {
    await page.keyboard.press(key);
  }
  await expect(option).toHaveAttribute("data-focused", "true");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(trigger).toBeFocused();
}

async function typeInto(page: Page, field: Locator, text: string) {
  await tabTo(page, field);
  await page.keyboard.type(text);
}

function candidate(page: Page, name: string) {
  return page
    .getByRole("list", { name: "Kortliste" })
    .getByRole("listitem")
    .filter({ hasText: name });
}

function statusBadge(page: Page, label: string) {
  return page.locator(".status-badge", { hasText: label });
}

async function openOwnerRequest(page: Page, id: string, title: string) {
  await page.goto(`/#/oppdrag/${id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible();
}

test.describe("Bare tastatur", () => {
  test("Tab kommer gjennom forsiden, skjemaet og oppdragssiden, og Shift+Tab går tilbake", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await tabThroughPage(page);

    await page.goto("/#/oppdrag/ny");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nytt oppdrag" }),
    ).toBeVisible();
    await tabThroughPage(page);

    await page.goto("/#/oppdrag/oppdrag-4");
    await expect(candidate(page, "Lena Eriksen")).toHaveCount(1);
    await tabThroughPage(page);

    await page.goto("/#/oppdrag");
    await expect(
      page.getByRole("heading", { level: 1, name: "Oppdrag" }),
    ).toBeVisible();
    const ids: string[] = [];
    for (let presses = 0; presses < 4; presses += 1) {
      await page.keyboard.press("Tab");
      ids.push(await describeFocus(page));
    }
    for (let presses = 2; presses >= 0; presses -= 1) {
      await page.keyboard.press("Shift+Tab");
      expect(await describeFocus(page)).toBe(ids[presses]);
    }
  });

  test("scenario 3: eieren publiserer et oppdrag bare med tastaturet", async ({
    page,
  }) => {
    const title = "Hjelp med innhold til vinterkampanjen";
    await page.goto("/#/oppdrag");
    await expect(
      page.getByRole("heading", { level: 1, name: "Oppdrag" }),
    ).toBeVisible();

    await tabTo(page, page.getByRole("button", { name: "Nytt oppdrag" }));
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nytt oppdrag" }),
    ).toBeFocused();

    await typeInto(page, page.getByRole("textbox", { name: "Tittel" }), title);
    await typeInto(
      page,
      page.getByRole("textbox", { name: "Beskrivelse" }),
      "Vi trenger hjelp med innhold og kampanjer i vinter.",
    );
    await tabTo(
      page,
      page.getByRole("combobox", { name: "Nødvendige ferdigheter" }),
    );
    await page.keyboard.type("Regnskap");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("row", { name: "Regnskap", exact: true }),
    ).toBeVisible();
    const tags = page.getByRole("grid", { name: /^Valgte/ });
    const removeFirst = page.getByRole("button", {
      name: /^Fjern Produktfotografering/,
    });
    await tabTo(page, removeFirst);
    await page.keyboard.press("Enter");
    await expect(removeFirst).toHaveCount(0);
    await expectFocusKept(page);
    for (const unwanted of ["Shopify-oppsett", "Regnskap"]) {
      const row = tags.getByRole("row", { name: new RegExp(`^${unwanted}`) });
      for (let presses = 0; presses < 6; presses += 1) {
        if (await isFocused(row)) {
          break;
        }
        await page.keyboard.press("ArrowRight");
      }
      await expect(row).toBeFocused();
      await expectFocusVisible(page);
      await page.keyboard.press("Delete");
      await expect(row).toHaveCount(0);
      await expectFocusKept(page);
    }
    await expect(tags.getByRole("row")).toHaveCount(2);
    await typeInto(
      page,
      page.getByRole("textbox", { name: "Tilleggskrav (valgfritt)" }),
      "Gjerne erfaring fra små nettbutikker.",
    );

    const start = daysFromToday(64);
    const digits = `${String(start.day).padStart(2, "0")}${String(start.month).padStart(2, "0")}${start.year}`;
    const segments = page.getByRole("spinbutton");
    await tabTo(page, segments.first());
    await page.keyboard.type(digits);
    await expect(segments.nth(0)).toHaveText(String(start.day));
    await expect(segments.nth(1)).toHaveText(String(start.month));
    await expect(segments.nth(2)).toHaveText(String(start.year));

    await typeInto(page, page.getByRole("textbox", { name: "Varighet" }), "6");
    await typeInto(
      page,
      page.getByRole("textbox", { name: "Timer per uke" }),
      "10",
    );
    await tabTo(page, page.getByRole("radio", { name: "Fjernarbeid" }));
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("radio", { name: "Fjernarbeid" }),
    ).toBeChecked();

    await tabTo(page, page.getByRole("button", { name: "Publiser oppdraget" }));
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await expect(
      page
        .locator('[aria-live="polite"]')
        .filter({ hasText: "Oppdraget er publisert" }),
    ).toHaveCount(1);
    await expect(statusBadge(page, "Kortliste klar")).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Kortliste" }).getByRole("listitem"),
    ).toHaveCount(3);
  });

  test("scenario 7: intervju, meldinger og tilbud, og bytte av bruker, bare med tastaturet", async ({
    page,
  }) => {
    const fromOwner = "Hei Lena! Har du tid til en prat torsdag?";
    const fromWorker = "Hei Kari! Torsdag passer fint.";
    await openOwnerRequest(
      page,
      "oppdrag-4",
      "Innhold og sosiale medier til julesalget",
    );

    await tabTo(
      page,
      candidate(page, "Lena Eriksen").getByRole("button", {
        name: "Inviter til intervju",
      }),
    );
    await page.keyboard.press("Enter");
    await expect(candidate(page, "Lena Eriksen")).toContainText(
      "Invitert til intervju",
    );
    await expect(statusBadge(page, "Kortliste klar")).toBeVisible();
    await expectFocusKept(page);

    const conversations = page.getByRole("tablist", { name: "Samtaler" });
    const lenaTab = conversations.getByRole("tab", { name: "Lena Eriksen" });
    await tabTo(page, conversations.getByRole("tab", { selected: true }));
    for (let presses = 0; presses < 3; presses += 1) {
      if ((await lenaTab.getAttribute("aria-selected")) === "true") {
        break;
      }
      await page.keyboard.press("ArrowRight");
    }
    await expect(lenaTab).toHaveAttribute("aria-selected", "true");
    await typeInto(
      page,
      page.getByRole("textbox", { name: "Skriv en melding" }),
      fromOwner,
    );
    await tabTo(page, page.getByRole("button", { name: "Send" }));
    await page.keyboard.press("Enter");
    await expect(page.getByText(fromOwner, { exact: true })).toBeVisible();

    await selectUserByKeyboard(page, "Lena Eriksen");
    await expect(page.getByText(fromOwner, { exact: true })).toBeVisible();
    await typeInto(
      page,
      page.getByRole("textbox", { name: "Skriv en melding" }),
      fromWorker,
    );
    await tabTo(page, page.getByRole("button", { name: "Send" }));
    await page.keyboard.press("Enter");
    await expect(page.getByText(fromWorker, { exact: true })).toBeVisible();

    await selectUserByKeyboard(page, "Kari Nordmann");
    await tabTo(
      page,
      candidate(page, "Lena Eriksen").getByRole("button", {
        name: "Gi tilbud",
      }),
    );
    await page.keyboard.press("Space");
    await expect(statusBadge(page, "Tilbud sendt")).toBeVisible();

    await selectUserByKeyboard(page, "Mats Johansen");
    await expect(
      page.getByRole("tablist", { name: "Samtaler" }).getByRole("tab"),
    ).toHaveText(["Kari Nordmann"]);
    await expect(page.getByText(fromOwner, { exact: true })).toHaveCount(0);
    await expect(page.getByText(fromWorker, { exact: true })).toHaveCount(0);
  });

  test("scenario 13: Tilbakestill demo med tastaturet, med fokus fanget i dialogen og tilbake til knappen", async ({
    page,
  }) => {
    await openOwnerRequest(
      page,
      "oppdrag-4",
      "Innhold og sosiale medier til julesalget",
    );
    await tabTo(
      page,
      candidate(page, "Lena Eriksen").getByRole("button", {
        name: "Inviter til intervju",
      }),
    );
    await page.keyboard.press("Enter");
    await expect(candidate(page, "Lena Eriksen")).toContainText(
      "Invitert til intervju",
    );

    const resetButton = page.getByRole("button", { name: "Tilbakestill demo" });
    const dialog = page.getByRole("alertdialog");
    await tabTo(page, resetButton);
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await expectTrappedIn(page, dialog);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(resetButton).toBeFocused();
    await expectFocusVisible(page);

    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await tabTo(
      page,
      dialog.getByRole("button", { name: "Tilbakestill", exact: true }),
    );
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("heading", { level: 1, name: "Hei, Kari!" }),
    ).toBeFocused();
    await expect(page).toHaveURL(/#\/$/);
    await expect(
      page
        .locator('[aria-live="polite"]')
        .filter({ hasText: "Demoen er tilbakestilt" }),
    ).toHaveCount(1);

    await page.goto("/#/oppdrag/oppdrag-4");
    await expect(candidate(page, "Lena Eriksen")).toHaveCount(1);
    await expect(candidate(page, "Lena Eriksen")).not.toContainText(
      "Invitert til intervju",
    );
  });

  test("arbeideren godtar et tilbud med tastaturet og fokus havner på Din status", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await selectUserByKeyboard(page, "Mats Johansen");
    await page.goto("/#/oppdrag/oppdrag-5");
    await expect(statusBadge(page, "Tilbud sendt")).toBeVisible();

    await tabTo(page, page.getByRole("button", { name: "Godta" }));
    await page.keyboard.press("Enter");

    await expect(statusBadge(page, "Avtalt")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Din status" }),
    ).toBeFocused();
    await expectFocusVisible(page);
    await expect(
      page
        .locator('[aria-live="polite"]')
        .filter({ hasText: "Du har godtatt tilbudet" }),
    ).toHaveCount(1);
  });

  test("arbeideren avslår et tilbud med tastaturet og fokus havner på sidens overskrift", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await selectUserByKeyboard(page, "Mats Johansen");
    await page.goto("/#/oppdrag/oppdrag-5");
    await expect(statusBadge(page, "Tilbud sendt")).toBeVisible();

    await tabTo(page, page.getByRole("button", { name: "Avslå" }));
    await page.keyboard.press("Enter");

    await expect(
      page.getByText(
        "Dette oppdraget er ikke lenger åpent for deg. Vi gir deg beskjed når vi finner nye oppdrag som passer deg.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expectFocusVisible(page);
    await expect(
      page
        .locator('[aria-live="polite"]')
        .filter({ hasText: "Du har avslått tilbudet" }),
    ).toHaveCount(1);
  });

  test("eieren avlyser et oppdrag med tastaturet og fokus havner på Detaljer", async ({
    page,
  }) => {
    await openOwnerRequest(
      page,
      "oppdrag-4",
      "Innhold og sosiale medier til julesalget",
    );

    await tabTo(page, page.getByRole("button", { name: "Avlys" }));
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await typeInto(
      page,
      dialog.getByRole("textbox", { name: "Hvorfor avlyses oppdraget?" }),
      "Oppdraget er ikke lenger aktuelt.",
    );
    await tabTo(page, dialog.getByRole("button", { name: "Avlys oppdraget" }));
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden();
    await expect(statusBadge(page, "Avlyst")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Detaljer" }),
    ).toBeFocused();
    await expectFocusVisible(page);
    await expect(
      page
        .locator('[aria-live="polite"]')
        .filter({ hasText: "Oppdraget er avlyst" }),
    ).toHaveCount(1);
  });
});
