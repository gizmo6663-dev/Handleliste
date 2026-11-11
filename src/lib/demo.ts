import { guessCategory, normalize } from './categories.ts';
import { isoDate } from './meals.ts';
import { DEFAULT_SETTINGS } from './storage.ts';
import { DAY } from './suggestions.ts';
import type { AppState, CatalogItem, PlannedMeal, Recipe, RecipeItem, Trip } from './types.ts';

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

  // Et par retter, så matplanen har noe å vise fra første stund.
  const find = (navn: string) => items.find((item) => item.key === normalize(navn));
  const recipes: Recipe[] = [
    {
      id: 'demo-rett-1',
      name: 'Kyllingwok',
      key: 'kyllingwok',
      items: ([
        { itemId: find('Kyllingfilet')?.id ?? '', part: 'ingrediens' },
        { itemId: find('Gulrøtter')?.id ?? '', part: 'ingrediens' },
        { itemId: find('Tomater')?.id ?? '', part: 'tilbehor' },
      ] as RecipeItem[]).filter((entry) => entry.itemId !== ''),
      createdAt: now - 30 * DAY,
      timesPlanned: 4,
    },
    {
      id: 'demo-rett-2',
      name: 'Vafler',
      key: 'vafler',
      items: ([
        { itemId: find('Egg')?.id ?? '', part: 'ingrediens' },
        { itemId: find('Lettmelk')?.id ?? '', part: 'ingrediens' },
        { itemId: find('Smør')?.id ?? '', part: 'tilbehor' },
      ] as RecipeItem[]).filter((entry) => entry.itemId !== ''),
      createdAt: now - 20 * DAY,
      timesPlanned: 2,
    },
  ];

  const meals: PlannedMeal[] = [
    { id: 'demo-maltid-1', date: isoDate(now), recipeId: 'demo-rett-1' },
    { id: 'demo-maltid-2', date: isoDate(now + 2 * DAY), recipeId: 'demo-rett-2' },
  ];

  return {
    version: 1,
    items,
    list: [],
    trips,
    recipes,
    meals,
    settings: { ...DEFAULT_SETTINGS },
  };
}
