import { useMemo } from 'react';
import { category } from '../lib/categories.ts';
import { DAY, describeDue, describeInterval, forecast } from '../lib/suggestions.ts';
import { useApp } from '../lib/store.ts';
import { plural, relativeDays } from '../lib/util.ts';
import { TopBar } from './TopBar.tsx';

export function InsightsView() {
  const state = useApp();
  const now = Date.now();

  const predictions = useMemo(
    () => forecast(state.items, now, state.settings),
    [state.items, now, state.settings],
  );

  const stats = useMemo(() => {
    const trips = state.trips.length;
    const totalItems = state.trips.reduce((sum, trip) => sum + trip.entries.length, 0);
    const mostBought = [...state.items]
      .filter((item) => item.purchases > 0)
      .sort((a, b) => b.purchases - a.purchases)
      .slice(0, 8);
    const lastTrip = state.trips[state.trips.length - 1];
    return {
      trips,
      averagePerTrip: trips > 0 ? Math.round((totalItems / trips) * 10) / 10 : 0,
      known: state.items.length,
      learned: predictions.length,
      mostBought,
      lastTrip,
    };
  }, [state.items, state.trips, predictions.length]);

  const timeline = useMemo(() => predictions.slice(0, 10), [predictions]);

  const byId = useMemo(
    () => new Map(state.items.map((item) => [item.id, item])),
    [state.items],
  );

  if (state.items.length === 0) {
    return (
      <>
        <TopBar title="Innsikt" />
        <main className="page">
          <div className="empty">
            <div className="empty-icon">📈</div>
            <h2>Ingen data ennå</h2>
            <p>
              Når du har handlet et par ganger, dukker mønstrene opp her: hva du kjøper oftest,
              og når appen tror du trenger det neste gang.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Innsikt"
        subtitle={
          stats.lastTrip ? `Sist handlet ${relativeDays(stats.lastTrip.completedAt, now)}` : undefined
        }
      />

      <main className="page">
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-value">{stats.trips}</div>
            <div className="stat-label">{stats.trips === 1 ? 'handletur' : 'handleturer'}</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.averagePerTrip || '—'}</div>
            <div className="stat-label">varer per tur i snitt</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.known}</div>
            <div className="stat-label">varer appen kjenner</div>
          </div>
          <div className="stat">
            <div className="stat-value">{stats.learned}</div>
            <div className="stat-label">med lært rytme</div>
          </div>
        </div>

        {timeline.length > 0 && (
          <section className="section">
            <h2 className="section-head">
              <span>Forventet framover</span>
            </h2>
            <div className="card">
              {timeline.map((prediction) => {
                const item = byId.get(prediction.itemId);
                if (!item) return null;
                const progress = Math.min(1.15, Math.max(0, prediction.urgency));
                const due = prediction.dueAt <= now + DAY;
                return (
                  <div className="suggestion-card" key={prediction.itemId}>
                    <span aria-hidden style={{ fontSize: '1.1rem' }}>
                      {category(item.category).icon}
                    </span>
                    <div className="setting-text">
                      <div className="setting-title">{item.name}</div>
                      <div className="setting-desc">
                        {describeInterval(prediction.intervalDays)} ·{' '}
                        {describeDue(prediction.dueAt, now)}
                      </div>
                      <div className="timeline-bar">
                        <div
                          className={due ? 'timeline-fill due' : 'timeline-fill'}
                          style={{ width: `${Math.min(100, progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {stats.mostBought.length > 0 && (
          <section className="section">
            <h2 className="section-head">
              <span>Oftest kjøpt</span>
            </h2>
            <div className="card">
              {stats.mostBought.map((item) => (
                <div className="suggestion-card" key={item.id}>
                  <span aria-hidden style={{ fontSize: '1.1rem' }}>
                    {category(item.category).icon}
                  </span>
                  <div className="setting-text">
                    <div className="setting-title">{item.name}</div>
                    <div className="setting-desc">{category(item.category).name}</div>
                  </div>
                  <span className="qty-pill">{plural(item.purchases, 'gang', 'ganger')}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
