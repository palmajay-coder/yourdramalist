// Orders Discover search results by how closely they match what was typed. MyDramaList returns titles and
// people in its own order; this puts the closest matches first and says which section should lead.

/** Lowercase, no accents or punctuation, single spaces. */
export function normalizeSearch(text: string): string {
  return String(text || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * How well a name matches the query, from 0 (no match) to 100 (exact).
 * Word order counts for little, so "Yoo Gong" still finds "Gong Yoo".
 */
export function matchScore(query: string, name: string): number {
  const q = normalizeSearch(query), n = normalizeSearch(name);
  if (!q || !n) return 0;
  if (n === q) return 100;
  const qWords = q.split(" "), nWords = n.split(" ");
  const sameWords = qWords.length === nWords.length && [...qWords].sort().join(" ") === [...nWords].sort().join(" ");
  if (sameWords) return 95;
  if (n.startsWith(q + " ")) return 85;
  if (n.startsWith(q)) return 75;
  // The typed words start consecutive words in the name ("lovely run" finds "Lovely Runner").
  for (let i = 0; i + qWords.length <= nWords.length; i++) {
    if (qWords.every((word, k) => nWords[i + k].startsWith(word))) return 65;
  }
  if (n.includes(q)) return 50;
  // Scattered or partial word hits are too weak to reorder MyDramaList's own results.
  return 0;
}

/** Sorts by score, highest first, keeping MyDramaList's order for equal scores. */
function rank<T>(items: T[], score: (item: T) => number): {items: T[]; best: number} {
  const scored = items.map((item, index) => ({item, index, value: score(item)}));
  scored.sort((a, b) => b.value - a.value || a.index - b.index);
  return {items: scored.map(entry => entry.item), best: scored[0]?.value ?? 0};
}

/**
 * Reorders titles and people by match quality. `peopleFirst` is true when the best person matches the query
 * better than the best title (typing an actor's name shows actors and directors first).
 */
export function rankSearchResults<T extends {titles?: any[]; people?: any[]}>(data: T, query: string) {
  const titles = rank(data.titles || [], item => matchScore(query, item?.name || ""));
  const people = rank(data.people || [], item => matchScore(query, item?.name || ""));
  return {...data, titles: titles.items, people: people.items,
    peopleFirst: people.items.length > 0 && people.best > titles.best};
}
