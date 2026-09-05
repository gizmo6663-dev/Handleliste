import { DEFAULT_CATEGORY_ORDER } from './categories.ts';
import type { AppState, CategoryId, Settings } from './types.ts';

export const STORAGE_KEY = 'handleliste:v1';
export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  categoryOrder: [...DEFAULT_CATEGORY_ORDER],
  leadFactor: 0.85,
  maxSuggestions: 6,
  minObservations: 2,
  showSuggestionStrip: true,
  groupChecked: true,
  haptics: true,
};

export function emptyState(): AppState {
  return {
    version: SCHEMA_VERSION,
    items: [],
    list: [],
    trips: [],
    settings: { ...DEFAULT_SETTINGS, categoryOrder: [...DEFAULT_CATEGORY_ORDER] },
  };
}

/**
 * Leser lagret tilstand og reparerer den mot dagens skjema.
 * Ødelagte eller ukjente felter skal aldri hindre appen i å starte.
 */
export function migrate(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;

  const input = raw as Partial<AppState>;
  const knownCategories = new Set<CategoryId>(DEFAULT_CATEGORY_ORDER);

  const items = Array.isArray(input.items)
    ? input.items
        .filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
        .map((item) => ({
          ...item,
          category: knownCategories.has(item.category) ? item.category : ('annet' as CategoryId),
          history: Array.isArray(item.history)
            ? item.history.filter((t) => typeof t === 'number' && Number.isFinite(t))
            : [],
          purchases: typeof item.purchases === 'number' ? item.purchases : 0,
          createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        }))
    : [];

  const itemIds = new Set(items.map((item) => item.id));
  const list = Array.isArray(input.list)
    ? input.list.filter(
        (entry) =>
          entry && typeof entry.id === 'string' && itemIds.has(entry.itemId as string),
      )
    : [];

  const settings = { ...base.settings, ...(input.settings ?? {}) };
  // Rekkefølgen må alltid inneholde alle kategorier, uten duplikater.
  const order = (settings.categoryOrder ?? []).filter(
    (id, index, all) => knownCategories.has(id) && all.indexOf(id) === index,
  );
  for (const id of DEFAULT_CATEGORY_ORDER) if (!order.includes(id)) order.push(id);
  settings.categoryOrder = order;
  settings.minObservations = Math.max(2, Number(settings.minObservations) || 2);
  settings.leadFactor = Math.min(1.2, Math.max(0.5, Number(settings.leadFactor) || 0.85));
  settings.maxSuggestions = Math.min(12, Math.max(1, Number(settings.maxSuggestions) || 6));

  return {
    version: SCHEMA_VERSION,
    items,
    list,
    trips: Array.isArray(input.trips) ? input.trips.slice(-100) : [],
    settings,
  };
}

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export function saveState(state: AppState): void {
  if (typeof localStorage === 'undefined') return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Full disk eller privat modus: appen fungerer videre, bare uten lagring.
    }
  }, 120);
}

/** Skriver umiddelbart — brukes når fanen lukkes. */
export function flushState(state: AppState): void {
  if (typeof localStorage === 'undefined') return;
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignorert med vilje */
  }
}
