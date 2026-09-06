import { Capacitor, registerPlugin } from '@capacitor/core';
import { category, normalize } from './categories.ts';
import { commonItems } from './common-items.ts';
import { formatQty } from './parse.ts';
import { DAY, describeInterval, forecast } from './suggestions.ts';
import type { AppState, CatalogItem, CategoryId } from './types.ts';

interface WidgetRow {
  entryId: string;
  itemId: string;
  icon: string;
  name: string;
  qty: string;
  checked: boolean;
  /** Gir flisen i widgeten et fargehint fra kategorien. */
  categoryId: CategoryId;
}

interface WidgetSuggestion {
  itemId: string;
  icon: string;
  name: string;
  why: string;
  categoryId: CategoryId;
  /**
   * Når forslaget skal begynne å vises. Widgeten filtrerer selv på dette,
   * slik at den holder seg riktig mellom hver gang appen er oppe.
   */
  suggestAt: number;
}

interface WidgetCategory {
  id: CategoryId;
  icon: string;
  name: string;
}

interface WidgetCatalogItem {
  /** Tom for vanlige varer appen ikke har møtt før — da opprettes de ved trykk. */
  itemId: string;
  icon: string;
  name: string;
  categoryId: CategoryId;
  /** Ligger allerede på lista, og skal derfor ikke kunne legges til igjen. */
  onList: boolean;
}

/** Et trykk gjort i en widget, som venter på å bli utført av appen. */
export interface WidgetOp {
  id: string;
  /** «addNew» er en vanlig vare appen ikke har møtt før — den har bare et navn. */
  type: 'toggle' | 'add' | 'addNew';
  entryId?: string;
  itemId?: string;
  navn?: string;
  at: number;
}

interface HandlelistePlugin {
  syncWidget(options: {
    list: WidgetRow[];
    suggestions: WidgetSuggestion[];
    remaining: number;
    categories: WidgetCategory[];
    catalog: WidgetCatalogItem[];
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

/**
 * Hvor høyt en av dine egne varer skal ligge i kategorien.
 *
 * Varer du kjøper ofte og nylig kommer øverst; de du ikke har rørt på lenge
 * synker — men forsvinner aldri. Det er med vilje: appen lærer også langsomme
 * rytmer, og en sesongvare skal stå der når sesongen kommer igjen.
 */
export function relevance(item: CatalogItem, now: number): number {
  const last = item.history[item.history.length - 1] ?? item.createdAt;
  const weeksSince = Math.max(0, (now - last) / (7 * DAY));
  // Halveringstid på åtte uker.
  return (item.purchases + 1) * Math.pow(0.5, weeksSince / 8);
}

/**
 * Er fristen for startvarene ute?
 *
 * Startvarene er et stillas: de gjør kategoriene brukbare fra dag én. Har du
 * ikke tatt i bruk en av dem innen fristen, er den trolig ikke aktuell for
 * deg, og den forsvinner så listene holder seg korte. Bruker du en, blir den
 * din egen vare og blir stående for godt.
 */
export function starterItemsExpired(state: AppState, now: number): boolean {
  const weeks = state.settings.starterItemWeeks;
  if (weeks <= 0) return false;
  const since = state.starterItemsSince;
  if (typeof since !== 'number') return false;
  return now - since > weeks * 7 * DAY;
}

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
    categoryId: item.category,
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
        categoryId: item.category,
        suggestAt: prediction.suggestAt,
      };
    })
    .filter((row): row is WidgetSuggestion => row !== null)
    .slice(0, MAX_SUGGESTIONS);

  // Katalogen man blar i fra widgeten: dine egne varer først, deretter
  // startvarene du ennå ikke har brukt. Uten startvarene ville kategoriene
  // stått tomme helt til du hadde rukket å skrive inn nok selv.
  const own: WidgetCatalogItem[] = state.items
    .filter((item) => !item.archived)
    .sort((a, b) => relevance(b, now) - relevance(a, now) || a.name.localeCompare(b.name, 'nb'))
    .map((item) => ({
      itemId: item.id,
      icon: category(item.category).icon,
      name: item.name,
      categoryId: item.category,
      onList: inList.has(item.id),
    }));

  const known = new Set(state.items.map((item) => item.key));
  const common: WidgetCatalogItem[] = starterItemsExpired(state, now)
    ? []
    : commonItems()
        .filter((entry) => !known.has(normalize(entry.name)))
        .map((entry) => ({
          itemId: '',
          icon: category(entry.category).icon,
          name: entry.name,
          categoryId: entry.category,
          onList: false,
        }));

  const catalog = [...own, ...common];

  // Kategoriene i butikkens rekkefølge; widgeten teller selv hvor mange
  // varer hver av dem har igjen å tilby.
  const categories: WidgetCategory[] = state.settings.categoryOrder.map((id) => ({
    id,
    icon: category(id).icon,
    name: category(id).name,
  }));

  return {
    list,
    suggestions,
    remaining: rows.filter(({ entry }) => !entry.checked).length,
    categories,
    catalog,
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
