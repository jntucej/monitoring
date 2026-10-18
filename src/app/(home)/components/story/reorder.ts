import { CHAPTERS, type Chapter, type ChapterId } from "../story/data";

export function reorderChapters(
  order: ChapterId[]
): Chapter[] {
  const byId = new Map(CHAPTERS.map((c) => [c.id, c]));
  const ordered = order
    .map((id) => byId.get(id))
    .filter((c): c is Chapter => Boolean(c));

  const seen = new Set(ordered.map((c) => c.id));
  const missing = CHAPTERS.filter((c) => !seen.has(c.id));

  return [...ordered, ...missing];
}
