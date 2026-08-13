import { expect, test } from "@playwright/test";

// Smoke test against the create-next-app scaffold. Assertions will tighten
// once Typecast's real UI replaces it.
test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/create next app/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
