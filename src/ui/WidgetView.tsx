import { useMemo } from 'react';
import { category } from '../lib/categories.ts';
import { formatQty } from '../lib/parse.ts';
import { buildSuggestions } from '../lib/suggestions.ts';
import { actions, useApp } from '../lib/store.ts';

/**
 * Kompakt visning ment for hjemskjerm-snarvei eller en liten widget-ramme.
 * Viser de neste varene og lar deg krysse av uten å åpne hele appen.
 */
export function WidgetView() {
  const state = useApp();

  const rows = useMemo(() => {
    const byId = new Map(state.items.map((item) => [item.id, item]));
    const order = new Map(state.settings.categoryOrder.map((id, index) => [id, index]));
    return state.list
      .filter((entry) => !entry.checked)
      .map((entry) => ({ entry, item: byId.get(entry.itemId) }))
      .filter((row): row is { entry: (typeof state.list)[number]; item: NonNullable<ReturnType<typeof byId.get>> } =>
        Boolean(row.item),
      )
      .sort(
        (a, b) =>
          (order.get(a.item.category) ?? 99) - (order.get(b.item.category) ?? 99) ||
          a.entry.addedAt - b.entry.addedAt,
      )
      .slice(0, 7);
  }, [state.list, state.items, state.settings.categoryOrder]);

  const suggestion = useMemo(
    () =>
      buildSuggestions({
        items: state.items,
        inList: new Set(state.list.map((entry) => entry.itemId)),
        now: Date.now(),
        settings: state.settings,
      })[0],
    [state.items, state.list, state.settings],
  );

  const remaining = state.list.filter((entry) => !entry.checked).length;
  const suggestedItem = suggestion
    ? state.items.find((item) => item.id === suggestion.itemId)
    : undefined;

  return (
    <div className="widget">
      <div className="widget-head">
        <h1>Handleliste</h1>
        <a href="#/">Åpne{remaining > 7 ? ` (+${remaining - 7})` : ''}</a>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Ingenting igjen på lista.
        </p>
      ) : (
        <div className="widget-list">
          {rows.map(({ entry, item }) => (
            <button
              key={entry.id}
              type="button"
              className="widget-line"
              onClick={() => actions.toggleEntry(entry.id)}
            >
              <span className="cat" aria-hidden>
                {category(item.category).icon}
              </span>
              <span style={{ flex: 1, textAlign: 'left' }}>{item.name}</span>
              {(entry.qty > 1 || (entry.unit && entry.unit !== 'stk')) && (
                <span className="qty-pill">{formatQty(entry.qty, entry.unit)}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {suggestedItem && (
        <button
          type="button"
          className="chip"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => actions.addItem(suggestedItem.id, 'forslag')}
        >
          <span className="plus">+</span>
          {suggestedItem.name}
          <span className="why">snart tomt?</span>
        </button>
      )}
    </div>
  );
}
