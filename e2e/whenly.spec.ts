import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
async function add(page: Page, name: string) {
  await page
    .getByRole("button", { name: "Add an activity", exact: true })
    .or(page.getByRole("button", { name: "Add activity", exact: true }))
    .filter({ visible: true })
    .click();
  await page.getByLabel("Activity name").fill(name);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add activity", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
function pastInput(days: number) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(Date.now() - days * 86400000)
    .replace(" ", "T");
}
test("welcoming empty state, responsive layout, accessible dialog and theme", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Start remembering." }),
  ).toBeVisible();
  await expect(page.locator(".suggestion-card")).toHaveCount(6);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-welcome.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Add your first activity" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Activity name").fill("A little test");
  await expect(page.getByRole("dialog").locator("> div")).toHaveCSS(
    "opacity",
    "1",
  );
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest("dialog")),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Light", exact: true }),
  ).toHaveCSS("background-color", "rgb(42, 48, 40)");
  await expect(
    page.getByRole("heading", { name: "A space that feels like you." }),
  ).toHaveCSS("color", "rgb(237, 240, 231)");
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-dark-settings.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("create, record, undo, edit history, backup and persist offline", async ({
  page,
  context,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Add your first activity" }).click();
  await page.getByLabel("Activity name").fill("Watered my plants");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add activity", exact: true })
    .click();
  await expect(
    page.getByText("Not recorded yet", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Just did it: Watered my plants",
      exact: true,
    })
    .click();
  await expect(page.getByText("Just now", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByText("Not recorded yet", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open Watered my plants" }).click();
  await page.getByRole("button", { name: "Edit activity" }).click();
  await page.getByLabel("Activity name").fill("Watered the plants");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: "Watered the plants", exact: true }),
  ).toBeVisible();
  for (const days of [10, 7, 4]) {
    await page.getByRole("button", { name: "Add a past memory" }).click();
    await page
      .getByLabel("Date and time", { exact: true })
      .fill(pastInput(days));
    await page.getByLabel("A note").fill(`A memory from ${days} days ago`);
    await page.getByRole("button", { name: "Save memory" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await page.getByRole("button", { name: "Just did it", exact: true }).click();
  await expect(page.locator(".timeline>li")).toHaveCount(4);
  await expect(
    page.locator(".stat-card").filter({ hasText: "Average interval" }),
  ).toContainText("3.3 days");
  await page.getByRole("button", { name: "Edit activity" }).click();
  await page.getByRole("button", { name: /A few more details/ }).click();
  await page
    .getByRole("button", { name: "Use your average of 3 days" })
    .click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Every 3 days.", { exact: true })).toBeVisible();
  await expect(page.locator(".toast")).toHaveCount(1);
  await expect(page.locator(".toast")).toHaveCSS("opacity", "1");
  expect((await new AxeBuilder({page}).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-detail.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator(".timeline>li")).toHaveCount(4);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-settings-before-export.png`,
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const backup = JSON.parse(await readFile(path!, "utf8"));
  expect(backup.activities).toHaveLength(1);
  expect(backup.events).toHaveLength(4);
  for (let i = 0; i < 2; i++) {
    await page.getByLabel("Import whenly backup").setInputFiles({
      name: "whenly.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await expect(page.getByRole("dialog")).toHaveAccessibleName(
      "Welcome your memories back",
    );
    await page.getByRole("button", { name: "Merge memories" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await page.getByRole("link", { name: "My activities" }).click();
  await page.getByLabel("Search activities").fill("missing");
  await expect(
    page.getByRole("heading", { name: "Nothing by that name." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await add(page, "Changed bedsheets");
  await add(page, "Called my parents");
  await expect(
    page.getByRole("article").filter({ hasText: "Called my parents" }),
  ).toHaveCSS("opacity", "1");
  await expect(page.locator(".toast")).toHaveCount(1);
  await expect(page.locator(".toast")).toHaveCSS("opacity", "1");
  expect((await new AxeBuilder({page}).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-activities.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Watered the plants", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("You’re offline. Your memories are still right here."),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Just did it: Changed bedsheets",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("article").filter({ hasText: "Changed bedsheets" }),
  ).toContainText("Just now");
  await page.reload();
  await expect(
    page.getByRole("article").filter({ hasText: "Changed bedsheets" }),
  ).toContainText("Just now");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Open Watered the plants" }).click();
  await expect(page.locator(".timeline>li")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Archive activity", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Restore activity" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore activity" }).click();
  await expect(
    page.getByRole("button", { name: "Just did it", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("correct history and deliberately replace or clear personal data", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: /Changed bedsheets A fresh start/ })
    .click();
  await expect(page.getByLabel("Activity name")).toHaveValue(
    "Changed bedsheets",
  );
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue(
    "home",
  );
  await page.getByRole("button", { name: "I know when" }).click();
  await page.getByLabel("Last completed date and time").fill(pastInput(5));
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add activity", exact: true })
    .click();
  await page.getByRole("button", { name: "Open Changed bedsheets" }).click();
  await page.getByRole("button", { name: "Just did it", exact: true }).click();
  await expect(page.locator(".timeline>li")).toHaveCount(2);
  await page
    .getByRole("button", { name: /Edit memory from/ })
    .first()
    .click();
  await page.getByLabel("Date and time", { exact: true }).fill(pastInput(1));
  await page.getByLabel("A note").fill("Fresh linen");
  await page.getByRole("button", { name: "Save memory" }).click();
  await expect(page.getByText("Fresh linen", { exact: true })).toBeVisible();
  await expect(
    page.locator(".stat-card").filter({ hasText: "Average interval" }),
  ).toContainText("4 days");
  await page
    .getByRole("button", { name: /Delete memory from/ })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Delete memory", exact: true })
    .click();
  await expect(page.locator(".timeline>li")).toHaveCount(1);
  await expect(
    page.locator(".stat-card").filter({ hasText: "Average interval" }),
  ).toContainText("—");
  await page.getByRole("link", { name: "My activities" }).click();
  await add(page, "Watered my plant");
  await page.getByLabel("Sort activities").selectOption("custom");
  await page
    .getByRole("button", { name: "Move Watered my plant earlier" })
    .click();
  await expect(page.getByRole("article").first()).toContainText(
    "Watered my plant",
  );
  await page.getByRole("link", { name: "Insights", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Most often remembered" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Changed bedsheets 1 memory recorded/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Custom category name").fill("Garden");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Delete category Garden" }).click();
  await page
    .getByRole("button", { name: "Remove category", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Delete category Garden" }),
  ).not.toBeVisible();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await promise;
  const backup = await readFile((await download.path())!);
  await page.getByRole("link", { name: "My activities" }).click();
  await add(page, "An extra little thing");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Import whenly backup").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: backup,
  });
  await page
    .getByLabel("How would you like to restore?")
    .selectOption("replace");
  await page
    .getByRole("button", { name: "Replace all data", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByLabel("I understand my current data will be replaced.")
    .check();
  await page
    .getByRole("button", { name: "Replace all data", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "My activities" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Clear data", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Clear data", exact: true }).click();
  await page
    .getByRole("button", { name: "Clear all data", exact: true })
    .click();
  await page.getByRole("link", { name: "My activities" }).click();
  await expect(
    page.getByRole("heading", { name: "Start remembering." }),
  ).toBeVisible();
});
