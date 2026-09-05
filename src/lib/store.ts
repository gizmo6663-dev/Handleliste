import { useSyncExternalStore } from 'react';
import { guessCategory, normalize } from './categories.ts';
import { parseInput } from './parse.ts';
import { DAY } from './suggestions.ts';
import { emptyState, flushState, loadState, migrate, saveState, STORAGE_KEY } from './storage.ts';
import { syncWidget } from './widget.ts';
import type {
  AppState,
  CatalogItem,
  CategoryId,
  EntrySource,
  ListEntry,
  Settings,
  Trip,
} from './types.ts';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let state: AppState = loadState();
const listeners = new Set<() => void>();

/** Snapshots for angring. Holder de siste stegene, ikke hele historien. */
const undoStack: AppState[] = [];
const UNDO_LIMIT = 25;
let lastUndoLabel = '';

function emit(): void {
  for (const listener of listeners) listener();
}

function commit(next: AppState, undoLabel?: string): void {
  if (undoLabel) {
    undoStack.push(state);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    lastUndoLabel = undoLabel;
  }
  state = next;
  saveState(state);
  syncWidget(state);
  emit();
}

export function getState(): AppState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Hele tilstanden. Appen er liten nok til at det er billigere enn selektorer. */
export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function canUndo(): boolean {
  return undoStack.length > 0;
}

export function undoLabel(): string {
  return lastUndoLabel;
}

/** Holder andre faner synkronisert når lista endres på en av dem. */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      state = migrate(JSON.parse(event.newValue));
      syncWidget(state);
      emit();
    } catch {
      /* ignorert med vilje */
    }
  });
  window.addEventListener('pagehide', () => flushState(state));
}

// ---------------------------------------------------------------------------
// Hjelpere
// ---------------------------------------------------------------------------

function findItemByName(items: readonly CatalogItem[], name: string): CatalogItem | undefined {
  const key = normalize(name);
  return items.find((item) => item.key === key);
}

function createItem(name: string, unit?: string): CatalogItem {
  const item: CatalogItem = {
    id: newId(),
    name: name.charAt(0).toUpperCase() + name.slice(1),
    key: normalize(name),
    category: guessCategory(name),
    history: [],
    purchases: 0,
    createdAt: Date.now(),
  };
  if (unit) item.unit = unit;
  return item;
}

// ---------------------------------------------------------------------------
// Handlinger
// ---------------------------------------------------------------------------

export const actions = {
  /**
   * Legger til fra fritekst. Kjenner appen varen fra før, gjenbrukes den —
   * det er slik historikken bygger seg opp på tvers av handleturer.
   */
  addByText(raw: string, source: EntrySource = 'manuell'): ListEntry | null {
    const parsed = parseInput(raw);
    if (!parsed.name.trim()) return null;

    const now = Date.now();
    const items = [...state.items];
    let item = findItemByName(items, parsed.name);

    if (!item) {
      item = createItem(parsed.name, parsed.unit);
      items.push(item);
    }
    const itemId = item.id;

    const existing = state.list.find((entry) => entry.itemId === itemId);
    if (existing) {
      // Allerede på lista: øk antallet i stedet for å lage en dublett.
      commit(
        {
          ...state,
          items,
          list: state.list.map((entry) =>
            entry.id === existing.id ? { ...entry, qty: entry.qty + parsed.qty } : entry,
          ),
        },
        `Økte antall ${item.name.toLowerCase()}`,
      );
      return existing;
    }

    const entry: ListEntry = {
      id: newId(),
      itemId,
      qty: parsed.qty,
      checked: false,
      addedAt: now,
      source,
    };
    if (parsed.unit ?? item.unit) entry.unit = parsed.unit ?? item.unit;
    if (parsed.note) entry.note = parsed.note;

    commit(
      {
        ...state,
        items: items.map((candidate) =>
          candidate.id === itemId
            ? { ...candidate, history: [...candidate.history, now], snoozedUntil: undefined }
            : candidate,
        ),
        list: [...state.list, entry],
      },
      `La til ${item.name.toLowerCase()}`,
    );
    return entry;
  },

  /** Legger til en kjent vare direkte (forslag, favoritt, hurtigvalg). */
  addItem(itemId: string, source: EntrySource = 'manuell'): void {
    const item = state.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    if (state.list.some((entry) => entry.itemId === itemId)) return;

    const now = Date.now();
    const entry: ListEntry = {
      id: newId(),
      itemId,
      qty: item.defaultQty ?? 1,
      checked: false,
      addedAt: now,
      source,
    };
    if (item.unit) entry.unit = item.unit;

    commit(
      {
        ...state,
        items: state.items.map((candidate) =>
          candidate.id === itemId
            ? { ...candidate, history: [...candidate.history, now], snoozedUntil: undefined }
            : candidate,
        ),
        list: [...state.list, entry],
      },
      `La til ${item.name.toLowerCase()}`,
    );
  },

  toggleEntry(entryId: string): void {
    const now = Date.now();
    commit({
      ...state,
      list: state.list.map((entry) =>
        entry.id === entryId
          ? { ...entry, checked: !entry.checked, checkedAt: entry.checked ? undefined : now }
          : entry,
      ),
    });
  },

  setQty(entryId: string, qty: number): void {
    if (qty < 1) {
      actions.removeEntry(entryId);
      return;
    }
    commit({
      ...state,
      list: state.list.map((entry) => (entry.id === entryId ? { ...entry, qty } : entry)),
    });
  },

  setNote(entryId: string, note: string): void {
    commit({
      ...state,
      list: state.list.map((entry) =>
        entry.id === entryId ? { ...entry, note: note.trim() || undefined } : entry,
      ),
    });
  },

  /**
   * Fjerner en linje. Registreringen i historikken fjernes også, slik at
   * feiltasting ikke forstyrrer rytmen appen lærer.
   */
  removeEntry(entryId: string): void {
    const entry = state.list.find((candidate) => candidate.id === entryId);
    if (!entry) return;
    const item = state.items.find((candidate) => candidate.id === entry.itemId);

    commit(
      {
        ...state,
        items: state.items.map((candidate) => {
          if (candidate.id !== entry.itemId) return candidate;
          const index = candidate.history.lastIndexOf(entry.addedAt);
          if (index === -1) return candidate;
          const history = [...candidate.history];
          history.splice(index, 1);
          return { ...candidate, history };
        }),
        list: state.list.filter((candidate) => candidate.id !== entryId),
      },
      item ? `Fjernet ${item.name.toLowerCase()}` : 'Fjernet vare',
    );
  },

  setEntryCategory(entryId: string, category: CategoryId): void {
    const entry = state.list.find((candidate) => candidate.id === entryId);
    if (!entry) return;
    commit({
      ...state,
      items: state.items.map((item) =>
        item.id === entry.itemId ? { ...item, category } : item,
      ),
    });
  },

  toggleFavorite(itemId: string): void {
    commit({
      ...state,
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, favorite: !item.favorite } : item,
      ),
    });
  },

  /** Avslutter handleturen: kryssede varer arkiveres, resten blir liggende. */
  completeTrip(): Trip | null {
    const checked = state.list.filter((entry) => entry.checked);
    if (checked.length === 0) return null;

    const now = Date.now();
    const trip: Trip = {
      id: newId(),
      completedAt: now,
      entries: checked.map((entry) => {
        const item = state.items.find((candidate) => candidate.id === entry.itemId);
        return {
          itemId: entry.itemId,
          name: item?.name ?? 'Ukjent',
          category: item?.category ?? 'annet',
          qty: entry.qty,
          unit: entry.unit,
          checked: true,
        };
      }),
    };

    const purchasedIds = new Set(checked.map((entry) => entry.itemId));
    commit(
      {
        ...state,
        items: state.items.map((item) =>
          purchasedIds.has(item.id) ? { ...item, purchases: item.purchases + 1 } : item,
        ),
        list: state.list.filter((entry) => !entry.checked),
        trips: [...state.trips, trip].slice(-100),
      },
      'Fullførte handleturen',
    );
    return trip;
  },

  clearChecked(): void {
    if (!state.list.some((entry) => entry.checked)) return;
    commit(
      { ...state, list: state.list.filter((entry) => !entry.checked) },
      'Tømte kurven',
    );
  },

  clearList(): void {
    if (state.list.length === 0) return;
    commit({ ...state, list: [] }, 'Tømte lista');
  },

  /** «Ikke nå» — varen holder munn en stund, men rytmen huskes. */
  snoozeSuggestion(itemId: string, days: number): void {
    commit(
      {
        ...state,
        items: state.items.map((item) =>
          item.id === itemId ? { ...item, snoozedUntil: Date.now() + days * DAY } : item,
        ),
      },
      'Utsatte forslag',
    );
  },

  setAutoSuggest(itemId: string, enabled: boolean): void {
    commit({
      ...state,
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, autoSuggest: enabled, snoozedUntil: undefined } : item,
      ),
    });
  },

  renameItem(itemId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    commit({
      ...state,
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, name: trimmed, key: normalize(trimmed) } : item,
      ),
    });
  },

  setItemCategory(itemId: string, category: CategoryId): void {
    commit({
      ...state,
      items: state.items.map((item) => (item.id === itemId ? { ...item, category } : item)),
    });
  },

  /** Sletter en vare og hele historikken dens. */
  forgetItem(itemId: string): void {
    const item = state.items.find((candidate) => candidate.id === itemId);
    commit(
      {
        ...state,
        items: state.items.filter((candidate) => candidate.id !== itemId),
        list: state.list.filter((entry) => entry.itemId !== itemId),
      },
      item ? `Glemte ${item.name.toLowerCase()}` : 'Glemte vare',
    );
  },

  updateSettings(patch: Partial<Settings>): void {
    commit({ ...state, settings: { ...state.settings, ...patch } });
  },

  moveCategory(id: CategoryId, direction: -1 | 1): void {
    const order = [...state.settings.categoryOrder];
    const index = order.indexOf(id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= order.length) return;
    const [moved] = order.splice(index, 1);
    order.splice(target, 0, moved as CategoryId);
    commit({ ...state, settings: { ...state.settings, categoryOrder: order } });
  },

  undo(): boolean {
    const previous = undoStack.pop();
    if (!previous) return false;
    state = previous;
    saveState(state);
    syncWidget(state);
    emit();
    return true;
  },

  replaceState(next: AppState): void {
    commit(migrate(next), 'Importerte data');
  },

  resetAll(): void {
    commit(emptyState(), 'Nullstilte appen');
  },
};

export type Actions = typeof actions;
