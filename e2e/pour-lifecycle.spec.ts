import { test, expect } from "@playwright/test";

/**
 * Critical path: create job → create pour → run pre-check → log events → PDF.
 * This spec is a skeleton — seed users/jobs in a local Supabase before running.
 */

test.skip("pour lifecycle", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill("seed@example.com");
  await page.getByPlaceholder("password").fill("test1234");
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/dashboard/);
  await page.goto("/jobs");
  await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
});
