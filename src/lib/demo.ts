import { guessCategory, normalize } from './categories.ts';
import { DEFAULT_SETTINGS } from './storage.ts';
import { DAY } from './suggestions.ts';
import type { AppState, CatalogItem, Trip } from './types.ts';

/** [navn, dager mellom hvert kjøp, antall kjøp, dager siden sist] */
const SEED: Array<[string, number, number, number]> = [
  ['Lettmelk', 4, 9, 4],
  ['Grovbrød', 3, 12, 3],
  ['Egg', 10, 5, 9],
  ['Bananer', 7, 7, 6],
  ['Kaffe', 21, 4, 19],
  ['Smør', 14, 4, 6],
  ['Toalettpapir', 28, 3, 26],
  ['Kyllingfilet', 9, 5, 3],
  ['Gulrøtter', 8, 4, 2],
  ['Yoghurt', 6, 6, 5],
  ['Oppvaskmiddel', 45, 2, 40],
  ['Tomater', 7, 5, 1],
];

function jitter(days: number, index: number): number {
  // Liten, deterministisk variasjon så rytmen ser menneskelig ut.
  const wobble = Math.sin(index * 2.7) * 0.18;
  return days * (1 + wobble);
}

/**
 * Fyller appen med et realistisk utgangspunkt, slik at forslagene kan
 * prøves ut med en gang. Erstatter alt som ligger der fra før.
 */
export function demoState(now = Date.now()): AppState {
  const items: CatalogItem[] = SEED.map(([name, every, count, since], seedIndex) => {
    const last = now - since * DAY;
    const history: number[] = [];
    let stamp = last;
    for (let i = 0; i < count; i++) {
      history.unshift(stamp);
      stamp -= jitter(every, seedIndex + i) * DAY;
    }
    return {
      id: `demo-${seedIndex}`,
      name,
      key: normalize(name),
      category: guessCategory(name),
      history,
      purchases: count,
      favorite: seedIndex < 3,
      createdAt: history[0] ?? now,
    };
  });

  const trips: Trip[] = [1, 2, 3].map((index) => ({
    id: `demo-trip-${index}`,
    completedAt: now - index * 5 * DAY,
    entries: items.slice(0, 4 + index).map((item) => ({
      itemId: item.id,
      name: item.name,
      category: item.category,
      qty: 1,
      checked: true,
    })),
  }));

  return {
    version: 1,
    items,
    list: [],
    trips,
    settings: { ...DEFAULT_SETTINGS },
  };
}
