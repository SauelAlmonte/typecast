import { expect, test } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/typecast/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: /search movies/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/not endorsed or certified by TMDB/i),
  ).toBeVisible();
});
