import { expect, test } from "@playwright/test";

test("theme toggle works and resume page renders seeded data", async ({ page }) => {
  await page.goto("/?e2e=1&page=resume");

  await expect(page.getByText("Review resume edits like a pull request")).toBeVisible();
  await expect(page.getByText("Jane Doe")).toBeVisible();

  const html = page.locator("html");
  const initialTheme = await html.getAttribute("data-theme");
  await page.getByRole("button", { name: /switch to/i }).click();
  await expect(html).not.toHaveAttribute("data-theme", initialTheme || "light");
});

test("command palette and diff editor smoke path render seeded workflow", async ({ page }) => {
  await page.goto("/?e2e=1&page=diff");

  await expect(page.getByText("Platform Engineer")).toBeVisible();
  await expect(page.getByText("Docker-ready resume parsing workflows", { exact: false })).toBeVisible();

  await page.keyboard.press("Control+K");
  await expect(page.getByText("Command Palette")).toBeVisible();
  await page.getByRole("button", { name: "View Versions" }).click();
  await expect(page.getByText("Timeline of tailored resumes")).toBeVisible();
  await expect(page.getByText("Example Co")).toBeVisible();
});
