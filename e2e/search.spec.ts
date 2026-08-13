import { expect, test } from "@playwright/test";

// The suggest API is mocked so these tests exercise only the client:
// debounce, keyboard navigation, ARIA wiring, empty state, and recents.
// CI runs them without a database on purpose.
const FIXTURE = [
  {
    id: 1,
    mediaType: "tv",
    title: "Stranger Things",
    year: 2016,
    posterPath: null,
  },
  {
    id: 2,
    mediaType: "tv",
    title: "Star Trek: Strange New Worlds",
    year: 2022,
    posterPath: null,
  },
  {
    id: 3,
    mediaType: "movie",
    title: "Lucky Strike",
    year: 2026,
    posterPath: null,
  },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/suggest*", async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q") ?? "";
    await route.fulfill({ json: q.startsWith("zzz") ? [] : FIXTURE });
  });
  await page.goto("/");
});

test("typing opens ranked suggestions", async ({ page }) => {
  const input = page.getByRole("combobox", { name: /search movies/i });
  await input.fill("stran");
  await expect(
    page.getByRole("listbox", { name: /suggestions/i }),
  ).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(3);
});

test("arrow keys walk the options and Enter selects", async ({ page }) => {
  const input = page.getByRole("combobox", { name: /search movies/i });
  await input.fill("stran");
  await expect(page.getByRole("option")).toHaveCount(3);

  await input.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: /stranger things/i }),
  ).toHaveAttribute("aria-selected", "true");

  await input.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: /strange new worlds/i }),
  ).toHaveAttribute("aria-selected", "true");

  await input.press("Enter");
  await expect(input).toHaveValue("Star Trek: Strange New Worlds");
  await expect(page.getByRole("listbox")).toBeHidden();
});

test("ArrowUp wraps to the last option", async ({ page }) => {
  const input = page.getByRole("combobox", { name: /search movies/i });
  await input.fill("stran");
  await expect(page.getByRole("option")).toHaveCount(3);

  await input.press("ArrowDown");
  await input.press("ArrowUp");
  await expect(
    page.getByRole("option", { name: /lucky strike/i }),
  ).toHaveAttribute("aria-selected", "true");
});

test("Escape closes the panel and keeps the text", async ({ page }) => {
  const input = page.getByRole("combobox", { name: /search movies/i });
  await input.fill("stran");
  await expect(page.getByRole("listbox")).toBeVisible();

  await input.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(input).toHaveValue("stran");
});

test("no matches shows the empty state", async ({ page }) => {
  const input = page.getByRole("combobox", { name: /search movies/i });
  await input.fill("zzz");
  await expect(page.getByText(/no matches for/i)).toBeVisible();
  await expect(page.getByRole("listbox")).toBeHidden();
});

test("a selection becomes a recent search offered on empty focus", async ({
  page,
}) => {
  const input = page.getByRole("combobox", { name: /search movies/i });
  await input.fill("stran");
  await expect(page.getByRole("option")).toHaveCount(3);
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(input).toHaveValue("Stranger Things");

  await input.fill("");
  const recents = page.getByRole("listbox", { name: /recent searches/i });
  await expect(recents).toBeVisible();
  await expect(
    recents.getByRole("option", { name: /stranger things/i }),
  ).toBeVisible();
});
