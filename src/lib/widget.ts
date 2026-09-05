import { Capacitor, registerPlugin } from '@capacitor/core';
import { category } from './categories.ts';
import { formatQty } from './parse.ts';
import { describeInterval, forecast } from './suggestions.ts';
import type { AppState } from './types.ts';

interface WidgetRow {
  entryId: string;
  itemId: string;
  icon: string;
  name: string;
  qty: string;
  checked: boolean;
}

interface WidgetSuggestion {
  itemId: string;
  icon: string;
  name: string;
  why: string;
  /**
   * Når forslaget skal begynne å vises. Widgeten filtrerer selv på dette,
   * slik at den holder seg riktig mellom hver gang appen er oppe.
   */
  suggestAt: number;
}

/** Et trykk gjort i en widget, som venter på å bli utført av appen. */
export interface WidgetOp {
  id: string;
  type: 'toggle' | 'add';
  entryId?: string;
  itemId?: string;
  at: number;
}

interface HandlelistePlugin {
  syncWidget(options: {
    list: WidgetRow[];
    suggestions: WidgetSuggestion[];
    remaining: number;
  }): Promise<void>;
  takePendingOps(): Promise<{ ops: WidgetOp[] }>;
}

const native = registerPlugin<HandlelistePlugin>('Handleliste');

/**
 * Påfyll-widgeten får med seg litt fram i tid også, slik at den kan vise
 * ferske forslag uten at appen har vært åpen. Den ruller, men det er ingen
 * grunn til å sende hele katalogen.
 */
const MAX_SUGGESTIONS = 20;

let pending: ReturnType<typeof setTimeout> | undefined;

/** Det widgetene tegner fra. Eksportert for å kunne testes. */
export function buildWidgetSnapshot(state: AppState) {
  const items = new Map(state.items.map((item) => [item.id, item]));
  const order = new Map(state.settings.categoryOrder.map((id, index) => [id, index]));

  const rows = state.list
    .map((entry) => ({ entry, item: items.get(entry.itemId) }))
    .filter((row): row is { entry: (typeof state.list)[number]; item: NonNullable<typeof row.item> } =>
      Boolean(row.item),
    )
    .sort((a, b) => {
      // Det som gjenstår først, i butikkens rekkefølge; det avkryssede nederst.
      if (a.entry.checked !== b.entry.checked) return a.entry.checked ? 1 : -1;
      return (
        (order.get(a.item.category) ?? 99) - (order.get(b.item.category) ?? 99) ||
        a.entry.addedAt - b.entry.addedAt
      );
    });

  const list: WidgetRow[] = rows.map(({ entry, item }) => ({
    entryId: entry.id,
    itemId: item.id,
    icon: category(item.category).icon,
    name: item.name,
    qty:
      entry.qty > 1 || (entry.unit && entry.unit !== 'stk')
        ? formatQty(entry.qty, entry.unit)
        : '',
    checked: entry.checked,
  }));

  const now = Date.now();
  const inList = new Set(state.list.map((entry) => entry.itemId));

  // Samme utvalg som forslagsvisningen, men uten tidsgrensen: widgeten får
  // med seg forfallstidspunktet og avgjør selv når varen skal dukke opp.
  const suggestions: WidgetSuggestion[] = forecast(state.items, now, state.settings)
    .map((prediction) => {
      const item = items.get(prediction.itemId);
      if (!item) return null;
      if (item.autoSuggest === false) return null;
      if (inList.has(item.id)) return null;
      if (item.snoozedUntil && item.snoozedUntil > now) return null;
      // Så langt på overtid at rytmen åpenbart er brutt.
      if (prediction.urgency > 3.5) return null;
      return {
        itemId: item.id,
        icon: category(item.category).icon,
        name: item.name,
        why: describeInterval(prediction.intervalDays),
        suggestAt: prediction.suggestAt,
      };
    })
    .filter((row): row is WidgetSuggestion => row !== null)
    .slice(0, MAX_SUGGESTIONS);

  return {
    list,
    suggestions,
    remaining: rows.filter(({ entry }) => !entry.checked).length,
  };
}

/**
 * Sender lista og forslagene til hjemskjerm-widgetene.
 *
 * Widgetene kan ikke lese WebViewens localStorage, så appen dytter innholdet
 * over hver gang noe endrer seg. På web gjør funksjonen ingenting.
 */
export function syncWidget(state: AppState): void {
  if (!Capacitor.isNativePlatform()) return;

  // Lista endrer seg i rykk og napp; én oppdatering per rolige øyeblikk holder.
  clearTimeout(pending);
  pending = setTimeout(() => {
    native.syncWidget(buildWidgetSnapshot(state)).catch(() => {
      // Widgetene er en bonus — feiler de, skal appen gå videre som før.
    });
  }, 250);
}

/**
 * Henter trykkene som er gjort i widgetene siden sist, og tømmer køen.
 * Køen tømmes i samme operasjon som den leses, så et trykk kan ikke
 * utføres to ganger.
 */
export async function takePendingOps(): Promise<WidgetOp[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const { ops } = await native.takePendingOps();
    return Array.isArray(ops) ? ops : [];
  } catch {
    return [];
  }
}
