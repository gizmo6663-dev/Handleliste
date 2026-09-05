import { Capacitor, registerPlugin } from '@capacitor/core';
import { category } from './categories.ts';
import { formatQty } from './parse.ts';
import type { AppState } from './types.ts';

interface WidgetLine {
  text: string;
  qty: string;
}

interface HandlelistePlugin {
  syncWidget(options: { lines: WidgetLine[]; remaining: number }): Promise<void>;
}

const native = registerPlugin<HandlelistePlugin>('Handleliste');

/** Widgeten har plass til seks rader; resten oppsummeres der. */
const WIDGET_ROWS = 6;

let pending: ReturnType<typeof setTimeout> | undefined;

/**
 * Sender en kort oppsummering av lista til hjemskjerm-widgeten.
 *
 * Widgeten kan ikke lese WebViewens localStorage, så appen dytter innholdet
 * over hver gang lista endrer seg. På web gjør funksjonen ingenting.
 */
export function syncWidget(state: AppState): void {
  if (!Capacitor.isNativePlatform()) return;

  // Lista endrer seg i rykk og napp; én oppdatering per rolige øyeblikk holder.
  clearTimeout(pending);
  pending = setTimeout(() => {
    const items = new Map(state.items.map((item) => [item.id, item]));
    const order = new Map(state.settings.categoryOrder.map((id, index) => [id, index]));

    const open = state.list
      .filter((entry) => !entry.checked)
      .map((entry) => ({ entry, item: items.get(entry.itemId) }))
      .filter((row): row is { entry: (typeof state.list)[number]; item: NonNullable<typeof row.item> } =>
        Boolean(row.item),
      )
      .sort(
        (a, b) =>
          (order.get(a.item.category) ?? 99) - (order.get(b.item.category) ?? 99) ||
          a.entry.addedAt - b.entry.addedAt,
      );

    const lines: WidgetLine[] = open.slice(0, WIDGET_ROWS).map(({ entry, item }) => ({
      text: `${category(item.category).icon}  ${item.name}`,
      qty:
        entry.qty > 1 || (entry.unit && entry.unit !== 'stk')
          ? formatQty(entry.qty, entry.unit)
          : '',
    }));

    native.syncWidget({ lines, remaining: open.length }).catch(() => {
      // Widgeten er en bonus — feiler den, skal appen gå videre som før.
    });
  }, 250);
}
