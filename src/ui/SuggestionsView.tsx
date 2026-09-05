import { useMemo } from 'react';
import { category } from '../lib/categories.ts';
import {
  buildSuggestions,
  DAY,
  describeDue,
  describeInterval,
  forecast,
} from '../lib/suggestions.ts';
import { actions, useApp } from '../lib/store.ts';
import { tap } from '../lib/util.ts';
import type { Prediction } from '../lib/suggestions.ts';
import { TopBar } from './TopBar.tsx';
import { toast } from './toast.tsx';
import { IconClock, IconPlus } from './icons.tsx';

/** Hvor sikker appen er, vist som tre prikker. */
function Confidence({ value }: { value: number }) {
  const filled = value > 0.66 ? 3 : value > 0.36 ? 2 : 1;
  const label = filled === 3 ? 'god sikkerhet' : filled === 2 ? 'middels sikkerhet' : 'usikker';
  return (
    <span className="confidence" title={label} aria-label={label}>
      {[0, 1, 2].map((index) => (
        <i key={index} className={index < filled ? 'on' : ''} />
      ))}
    </span>
  );
}

export function SuggestionsView() {
  const state = useApp();
  const now = Date.now();

  const inList = useMemo(
    () => new Set(state.list.map((entry) => entry.itemId)),
    [state.list],
  );

  const suggestions = useMemo(
    () => buildSuggestions({ items: state.items, inList, now, settings: state.settings }),
    [state.items, inList, now, state.settings],
  );

  const upcoming = useMemo(() => {
    const suggested = new Set(suggestions.map((prediction) => prediction.itemId));
    return forecast(state.items, now, state.settings)
      .filter(
        (prediction) =>
          !suggested.has(prediction.itemId) &&
          !inList.has(prediction.itemId) &&
          prediction.dueAt > now &&
          prediction.dueAt < now + 30 * DAY,
      )
      .slice(0, 8);
  }, [state.items, suggestions, inList, now, state.settings]);

  const learning = useMemo(
    () => state.items.filter((item) => !item.archived && item.history.length === 1).length,
    [state.items],
  );

  const byId = useMemo(
    () => new Map(state.items.map((item) => [item.id, item])),
    [state.items],
  );

  function name(prediction: Prediction): string {
    return byId.get(prediction.itemId)?.name ?? 'Ukjent vare';
  }

  return (
    <>
      <TopBar
        title="Forslag"
        subtitle={
          suggestions.length > 0
            ? `${suggestions.length} ${suggestions.length === 1 ? 'vare' : 'varer'} nærmer seg`
            : 'Ingenting haster akkurat nå'
        }
      />

      <main className="page">
        {suggestions.length === 0 && upcoming.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🌱</div>
            <h2>Appen lærer fortsatt</h2>
            <p>
              {learning > 0
                ? `${learning} ${learning === 1 ? 'vare er' : 'varer er'} registrert én gang. Neste gang du legger dem til, vet appen hvor lang tid som gikk — og kan begynne å foreslå.`
                : 'Legg til varer som vanlig. Så snart en vare er lagt til to ganger, regner appen ut hvor ofte du pleier å trenge den.'}
            </p>
          </div>
        ) : null}

        {suggestions.length > 0 && (
          <section className="section">
            <h2 className="section-head">
              <span>Nærmer seg tomt</span>
            </h2>
            <div className="card">
              {suggestions.map((prediction) => {
                const item = byId.get(prediction.itemId);
                if (!item) return null;
                const meta = category(item.category);
                return (
                  <div className="suggestion-card" key={prediction.itemId}>
                    <span aria-hidden style={{ fontSize: '1.2rem' }}>
                      {meta.icon}
                    </span>
                    <div className="setting-text">
                      <div className="setting-title">
                        {item.name} <Confidence value={prediction.confidence} />
                      </div>
                      <div className="setting-desc">
                        Kjøpes {describeInterval(prediction.intervalDays)} · forventet{' '}
                        {describeDue(prediction.dueAt, now)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Utsett forslag om ${item.name}`}
                      title="Ikke nå"
                      onClick={() => {
                        const days = Math.max(2, Math.round(prediction.intervalDays / 3));
                        actions.snoozeSuggestion(item.id, days);
                        toast(`Spør igjen om ${days} dager`, {
                          label: 'Angre',
                          run: () => actions.undo(),
                        });
                      }}
                    >
                      <IconClock size={19} />
                    </button>
                    <button
                      type="button"
                      className="btn primary"
                      style={{ padding: '8px 14px' }}
                      onClick={() => {
                        actions.addItem(item.id, 'forslag');
                        tap();
                        toast(`La til ${item.name.toLowerCase()}`, {
                          label: 'Angre',
                          run: () => actions.undo(),
                        });
                      }}
                    >
                      <IconPlus size={17} />
                      Legg til
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="hint-text">
              Forslagene bygger bare på hvor ofte du selv legger inn varen. Ingenting sendes
              noe sted.
            </p>
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="section">
            <h2 className="section-head">
              <span>Litt lenger fram</span>
            </h2>
            <div className="card">
              {upcoming.map((prediction) => {
                const item = byId.get(prediction.itemId);
                if (!item) return null;
                return (
                  <div className="suggestion-card" key={prediction.itemId}>
                    <span aria-hidden style={{ fontSize: '1.2rem' }}>
                      {category(item.category).icon}
                    </span>
                    <div className="setting-text">
                      <div className="setting-title">{name(prediction)}</div>
                      <div className="setting-desc">
                        Trolig {describeDue(prediction.dueAt, now)} ·{' '}
                        {describeInterval(prediction.intervalDays)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: '8px 14px' }}
                      onClick={() => {
                        actions.addItem(item.id, 'forslag');
                        tap();
                      }}
                    >
                      <IconPlus size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
