import { useMemo, useState } from 'react';
import { category } from '../lib/categories.ts';
import { formatQty } from '../lib/parse.ts';
import { buildSuggestions, describeInterval } from '../lib/suggestions.ts';
import { actions, useApp } from '../lib/store.ts';
import { tap } from '../lib/util.ts';
import type { CatalogItem, CategoryId, ListEntry } from '../lib/types.ts';
import { Composer } from './Composer.tsx';
import { EntrySheet } from './EntrySheet.tsx';
import { ProgressRing, TopBar } from './TopBar.tsx';
import { toast } from './toast.tsx';
import { IconBag, IconCheck, IconStar } from './icons.tsx';

interface Group {
  id: CategoryId;
  entries: Array<{ entry: ListEntry; item: CatalogItem }>;
}

export function ListView({ navigate }: { navigate: (route: string) => void }) {
  const state = useApp();
  const [openEntry, setOpenEntry] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map(state.items.map((item) => [item.id, item])),
    [state.items],
  );

  const { groups, checkedRows, total, done } = useMemo(() => {
    const rows = state.list
      .map((entry) => ({ entry, item: byId.get(entry.itemId) }))
      .filter((row): row is { entry: ListEntry; item: CatalogItem } => Boolean(row.item));

    const separate = state.settings.groupChecked;
    const open = separate ? rows.filter((row) => !row.entry.checked) : rows;
    const checked = separate ? rows.filter((row) => row.entry.checked) : [];

    const buckets = new Map<CategoryId, Group>();
    for (const row of open) {
      const id = row.item.category;
      const bucket = buckets.get(id) ?? { id, entries: [] };
      bucket.entries.push(row);
      buckets.set(id, bucket);
    }

    const ordered = state.settings.categoryOrder
      .map((id) => buckets.get(id))
      .filter((group): group is Group => Boolean(group));

    for (const group of ordered) {
      group.entries.sort((a, b) => a.entry.addedAt - b.entry.addedAt);
    }

    return {
      groups: ordered,
      checkedRows: checked.sort((a, b) => (b.entry.checkedAt ?? 0) - (a.entry.checkedAt ?? 0)),
      total: rows.length,
      done: rows.filter((row) => row.entry.checked).length,
    };
  }, [state.list, state.settings.categoryOrder, state.settings.groupChecked, byId]);

  const suggestions = useMemo(() => {
    if (!state.settings.showSuggestionStrip) return [];
    return buildSuggestions({
      items: state.items,
      inList: new Set(state.list.map((entry) => entry.itemId)),
      now: Date.now(),
      settings: state.settings,
    }).slice(0, 4);
  }, [state.items, state.list, state.settings]);

  const favorites = useMemo(
    () =>
      state.items
        .filter(
          (item) =>
            item.favorite &&
            !item.archived &&
            !state.list.some((entry) => entry.itemId === item.id),
        )
        .slice(0, 8),
    [state.items, state.list],
  );

  return (
    <>
      <TopBar
        title="Handleliste"
        subtitle={
          total === 0
            ? 'Klar for en ny tur'
            : `${done} av ${total} ${total === 1 ? 'vare' : 'varer'} i kurven`
        }
      >
        {total > 0 && <ProgressRing done={done} total={total} />}
      </TopBar>

      <main className="page">
        {total === 0 && suggestions.length === 0 && favorites.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🧺</div>
            <h2>Lista er tom</h2>
            <p>
              Skriv inn det du trenger nederst — «2 l melk» blir tolket riktig. Etter et par
              turer begynner appen å kjenne igjen rytmen din.
            </p>
          </div>
        ) : null}

        {suggestions.length > 0 && (
          <section className="strip" aria-label="Forslag basert på rytmen din">
            <div className="strip-head">
              <span>Kanskje snart tomt</span>
              <button type="button" onClick={() => navigate('forslag')}>
                Se alle
              </button>
            </div>
            <div className="chips">
              {suggestions.map((prediction) => {
                const item = byId.get(prediction.itemId);
                if (!item) return null;
                return (
                  <button
                    key={prediction.itemId}
                    type="button"
                    className="chip"
                    onClick={() => {
                      actions.addItem(item.id, 'forslag');
                      tap();
                      toast(`La til ${item.name.toLowerCase()}`, {
                        label: 'Angre',
                        run: () => actions.undo(),
                      });
                    }}
                  >
                    <span className="plus">+</span>
                    {item.name}
                    <span className="why">{describeInterval(prediction.intervalDays)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {favorites.length > 0 && total === 0 && (
          <section className="section" aria-label="Favoritter">
            <div className="section-head">
              <IconStar size={14} filled />
              <span>Favoritter</span>
            </div>
            <div className="chips">
              {favorites.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="chip"
                  onClick={() => {
                    actions.addItem(item.id, 'favoritt');
                    tap();
                  }}
                >
                  <span className="plus">+</span>
                  {item.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {groups.map((group) => {
          const meta = category(group.id);
          return (
            <section
              className="section"
              key={group.id}
              style={{ ['--cat-h' as string]: String(meta.hue) }}
            >
              <h2 className="section-head">
                <span className="dot" />
                <span>{meta.name}</span>
                <span className="count">{group.entries.length}</span>
              </h2>
              <div className="card">
                {group.entries.map(({ entry, item }) => (
                  <Row
                    key={entry.id}
                    entry={entry}
                    item={item}
                    onOpen={() => setOpenEntry(entry.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {checkedRows.length > 0 && (
          <section className="section" aria-label="I kurven">
            <h2 className="section-head">
              <IconBag size={14} />
              <span>I kurven</span>
              <span className="count">{checkedRows.length}</span>
            </h2>
            <div className="card">
              {checkedRows.map(({ entry, item }) => (
                <Row
                  key={entry.id}
                  entry={entry}
                  item={item}
                  onOpen={() => setOpenEntry(entry.id)}
                />
              ))}
            </div>

            <div className="btn-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn primary block"
                onClick={() => {
                  const trip = actions.completeTrip();
                  if (trip) {
                    tap([10, 40, 14]);
                    toast(
                      `Handletur lagret — ${trip.entries.length} ${
                        trip.entries.length === 1 ? 'vare' : 'varer'
                      }`,
                      { label: 'Angre', run: () => actions.undo() },
                    );
                  }
                }}
              >
                <IconBag size={18} />
                Fullfør handletur
              </button>
            </div>
          </section>
        )}

        <Composer />
      </main>

      {openEntry && <EntrySheet entryId={openEntry} onClose={() => setOpenEntry(null)} />}
    </>
  );
}

interface RowProps {
  entry: ListEntry;
  item: CatalogItem;
  onOpen: () => void;
}

function Row({ entry, item, onOpen }: RowProps) {
  const meta: string[] = [];
  if (entry.note) meta.push(entry.note);

  return (
    <div className={entry.checked ? 'row checked' : 'row'}>
      <button
        type="button"
        className="check"
        role="checkbox"
        aria-checked={entry.checked}
        aria-label={`${entry.checked ? 'Fjern' : 'Sett'} kryss for ${item.name}`}
        onClick={() => {
          actions.toggleEntry(entry.id);
          tap(entry.checked ? 5 : 11);
        }}
      >
        <IconCheck />
      </button>

      <button type="button" className="row-main" onClick={onOpen}>
        <span className="row-name">{item.name}</span>
        {(meta.length > 0 || entry.source === 'forslag') && (
          <span className="row-meta">
            {entry.source === 'forslag' && <span className="row-source">foreslått</span>}
            {meta.join(' · ')}
          </span>
        )}
      </button>

      {(entry.qty > 1 || (entry.unit && entry.unit !== 'stk')) && (
        <span className="qty-pill">{formatQty(entry.qty, entry.unit)}</span>
      )}
    </div>
  );
}
