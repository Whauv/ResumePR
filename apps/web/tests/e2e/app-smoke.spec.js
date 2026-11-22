import { expect, test } from "@playwright/test";

test("theme toggle works and resume page renders seeded data", async ({ page }) => {
  await page.goto("/?e2e=1&page=resume");

  await expect(page.getByText("Review resume edits like a pull request")).toBeVisible();
  await expect(page.getByText("Jane Doe")).toBeVisible();

  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");
  await page.getByTestId("theme-toggle").click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.getByTestId("theme-toggle").click();
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("command palette and diff editor smoke path render seeded workflow", async ({ page }) => {
  await page.goto("/?e2e=1&page=diff");

  await expect(page.getByText("Platform Engineer")).toBeVisible();
  await expect(page.getByText("Docker-ready resume parsing workflows", { exact: false })).toBeVisible();

  await page.keyboard.press("Control+K");
  await expect(page.getByText("Command Palette", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View Versions" }).click();
  await expect(page.getByText("Timeline of tailored resumes")).toBeVisible();
  await expect(page.getByRole("heading", { name: /v1 - Example Co - Platform Engineer/i })).toBeVisible();
});
