/**
 * Normalize a title or query fragment for search matching.
 *
 * Runs identically at ingest (filling `media.title_search`) and at query
 * time (on the user's fragment), so the two sides can never drift apart.
 * NFKD decomposition splits accented letters into base letter plus
 * combining mark, and the mark strip leaves plain ASCII where possible:
 * "Amélie" and "amelie" normalize to the same string.
 *
 * @param input - Raw title or user-typed fragment.
 * @returns Lowercased, diacritic-free text with runs of whitespace
 *   collapsed to single spaces and ends trimmed.
 */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
