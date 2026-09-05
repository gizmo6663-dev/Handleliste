import { describe, expect, it } from 'vitest';
import { buildSuggestions, collapseHistory, DAY, describeInterval, predict } from './suggestions.ts';
import type { CatalogItem } from './types.ts';

const SETTINGS = { leadFactor: 0.85, minObservations: 2, maxSuggestions: 6 };
const NOW = Date.UTC(2026, 0, 31, 12, 0, 0);

function item(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: 'i1',
    name: 'Melk',
    key: 'melk',
    category: 'meieri',
    history: [],
    purchases: 0,
    createdAt: NOW - 90 * DAY,
    ...overrides,
  };
}

/** Historikk med jevnt mellomrom, siste registrering `sinceDays` dager siden. */
function rhythm(count: number, everyDays: number, sinceDays: number): number[] {
  const last = NOW - sinceDays * DAY;
  return Array.from({ length: count }, (_, i) => last - (count - 1 - i) * everyDays * DAY);
}

describe('collapseHistory', () => {
  it('slår sammen registreringer fra samme handletur', () => {
    const base = NOW - 10 * DAY;
    const collapsed = collapseHistory([base, base + 60_000, base + 3 * 3_600_000]);
    expect(collapsed).toHaveLength(1);
  });

  it('beholder registreringer på ulike dager', () => {
    const base = NOW - 10 * DAY;
    expect(collapseHistory([base, base + 2 * DAY, base + 4 * DAY])).toHaveLength(3);
  });

  it('sorterer historikk som kommer i uorden', () => {
    const base = NOW - 10 * DAY;
    const collapsed = collapseHistory([base + 4 * DAY, base, base + 2 * DAY]);
    expect(collapsed).toEqual([base, base + 2 * DAY, base + 4 * DAY]);
  });
});

describe('predict', () => {
  it('gir ingen prognose etter bare én registrering', () => {
    expect(predict(item({ history: rhythm(1, 7, 1) }), NOW, SETTINGS)).toBeNull();
  });

  it('gir prognose så snart varen er registrert to ganger', () => {
    const prediction = predict(item({ history: rhythm(2, 7, 1) }), NOW, SETTINGS);
    expect(prediction).not.toBeNull();
    expect(prediction!.intervalDays).toBeCloseTo(7, 1);
    expect(prediction!.cycles).toBe(1);
  });

  it('teller to registreringer samme dag som én, og gir da ingen prognose', () => {
    const base = NOW - 5 * DAY;
    expect(predict(item({ history: [base, base + 3_600_000] }), NOW, SETTINGS)).toBeNull();
  });

  it('vekter nyere intervaller tyngst når rytmen endrer seg', () => {
    // Sju dager mellom de første kjøpene, tre dager mellom de siste.
    const history = [
      NOW - 24 * DAY,
      NOW - 17 * DAY,
      NOW - 10 * DAY,
      NOW - 7 * DAY,
      NOW - 4 * DAY,
      NOW - 1 * DAY,
    ];
    const prediction = predict(item({ history }), NOW, SETTINGS)!;
    expect(prediction.intervalDays).toBeLessThan(5);
    expect(prediction.intervalDays).toBeGreaterThan(3);
  });

  it('gir høyere sikkerhet ved jevn rytme enn ved ujevn', () => {
    const steady = predict(item({ history: rhythm(6, 7, 1) }), NOW, SETTINGS)!;
    const erratic = predict(
      item({ history: [NOW - 40 * DAY, NOW - 38 * DAY, NOW - 12 * DAY, NOW - 1 * DAY] }),
      NOW,
      SETTINGS,
    )!;
    expect(steady.confidence).toBeGreaterThan(erratic.confidence);
  });

  it('regner ut forfall og hastegrad fra siste registrering', () => {
    const prediction = predict(item({ history: rhythm(4, 10, 5) }), NOW, SETTINGS)!;
    expect(prediction.urgency).toBeCloseTo(0.5, 1);
    expect(prediction.dueAt).toBeCloseTo(NOW + 5 * DAY, -5);
  });
});

describe('buildSuggestions', () => {
  const context = (items: CatalogItem[], inList: string[] = []) => ({
    items,
    inList: new Set(inList),
    now: NOW,
    settings: SETTINGS,
  });

  it('foreslår ingenting før varen er registrert minst to ganger', () => {
    const only = item({ history: rhythm(1, 7, 9) });
    expect(buildSuggestions(context([only]))).toHaveLength(0);
  });

  it('foreslår varen når det nærmer seg at man går tom', () => {
    // Sju dagers rytme, seks dager siden sist: 86 % gjennom intervallet.
    const melk = item({ history: rhythm(3, 7, 6) });
    expect(buildSuggestions(context([melk]))).toHaveLength(1);
  });

  it('tier tidlig i intervallet', () => {
    const melk = item({ history: rhythm(3, 7, 2) });
    expect(buildSuggestions(context([melk]))).toHaveLength(0);
  });

  it('foreslår ikke varer som allerede ligger i lista', () => {
    const melk = item({ history: rhythm(3, 7, 8) });
    expect(buildSuggestions(context([melk], [melk.id]))).toHaveLength(0);
  });

  it('respekterer utsettelse', () => {
    const melk = item({ history: rhythm(3, 7, 8), snoozedUntil: NOW + 2 * DAY });
    expect(buildSuggestions(context([melk]))).toHaveLength(0);
  });

  it('respekterer at forslag er slått av for varen', () => {
    const melk = item({ history: rhythm(3, 7, 8), autoSuggest: false });
    expect(buildSuggestions(context([melk]))).toHaveLength(0);
  });

  it('tier når varen er så langt på overtid at rytmen trolig er endret', () => {
    const melk = item({ history: rhythm(3, 7, 40) });
    expect(buildSuggestions(context([melk]))).toHaveLength(0);
  });

  it('rangerer det mest forfalte og sikreste øverst', () => {
    const jevnOgForfalt = item({ id: 'a', history: rhythm(5, 7, 9) });
    const såvidtAktuell = item({ id: 'b', name: 'Egg', key: 'egg', history: rhythm(5, 14, 12) });
    const suggestions = buildSuggestions(context([såvidtAktuell, jevnOgForfalt]));
    expect(suggestions[0]!.itemId).toBe('a');
  });

  it('begrenser antallet til innstillingen', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      item({ id: `i${i}`, key: `vare${i}`, history: rhythm(4, 7, 8) }),
    );
    expect(buildSuggestions({ ...context(many), settings: { ...SETTINGS, maxSuggestions: 3 } }))
      .toHaveLength(3);
  });
});

describe('describeInterval', () => {
  it('beskriver rytmen på norsk', () => {
    expect(describeInterval(1)).toBe('omtrent daglig');
    expect(describeInterval(2)).toBe('annenhver dag');
    expect(describeInterval(4)).toBe('hver 4. dag');
    expect(describeInterval(7)).toBe('omtrent ukentlig');
    expect(describeInterval(14)).toBe('annenhver uke');
    expect(describeInterval(60)).toBe('omtrent månedlig');
  });
});
