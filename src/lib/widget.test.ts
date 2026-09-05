import { beforeEach, describe, expect, it } from 'vitest';
import { actions, getState } from './store.ts';
import { buildWidgetSnapshot } from './widget.ts';
import { DAY } from './suggestions.ts';

/** Legger en vare i lista og fullfører turen, så historikken bygger seg opp. */
function kjopt(navn: string): string {
  actions.addByText(navn);
  const entry = getState().list.find((row) => !row.checked);
  if (entry) {
    actions.toggleEntry(entry.id);
    actions.completeTrip();
  }
  const item = getState().items.find((candidate) => candidate.key === navn.toLowerCase());
  return item!.id;
}

describe('handlinger utført i en widget', () => {
  beforeEach(() => actions.resetAll());

  it('registrerer historikk på tidspunktet trykket skjedde', () => {
    const itemId = kjopt('melk');
    const iGar = Date.now() - DAY;

    actions.addItem(itemId, 'forslag', iGar);

    const item = getState().items.find((candidate) => candidate.id === itemId)!;
    expect(item.history).toHaveLength(2);
    // Tidspunktet fra widgeten, ikke da appen rakk å lese køen.
    expect(item.history[1]).toBe(iGar);
  });

  it('krysser av med tidspunktet fra widgeten', () => {
    actions.addByText('brød');
    const entry = getState().list[0]!;
    const iGar = Date.now() - DAY;

    actions.toggleEntry(entry.id, iGar);

    const oppdatert = getState().list[0]!;
    expect(oppdatert.checked).toBe(true);
    expect(oppdatert.checkedAt).toBe(iGar);
  });

  it('lar et trykk i widgeten bygge rytmen forslagene bruker', () => {
    const itemId = kjopt('melk');
    // Første kjøp dateres tilbake, det neste ligger sju dager etter.
    const items = getState().items.map((item) =>
      item.id === itemId ? { ...item, history: [Date.now() - 14 * DAY] } : item,
    );
    actions.replaceState({ ...getState(), items });

    actions.addItem(itemId, 'forslag', Date.now() - 7 * DAY);

    const snapshot = buildWidgetSnapshot(getState());
    // Varen ligger på lista nå, så den skal ikke også foreslås.
    expect(snapshot.list.map((row) => row.name)).toContain('Melk');
    expect(snapshot.suggestions.map((row) => row.name)).not.toContain('Melk');
  });
});

describe('det widgetene tegner fra', () => {
  beforeEach(() => actions.resetAll());

  it('setter det som gjenstår øverst og det avkryssede nederst', () => {
    actions.addByText('melk');
    actions.addByText('brød');
    actions.addByText('agurk');

    const melk = getState().list.find((row) => row.itemId === getState().items[0]!.id)!;
    actions.toggleEntry(melk.id);

    const snapshot = buildWidgetSnapshot(getState());
    expect(snapshot.list).toHaveLength(3);
    expect(snapshot.list[snapshot.list.length - 1]!.checked).toBe(true);
    expect(snapshot.list.slice(0, 2).every((row) => !row.checked)).toBe(true);
  });

  it('teller bare det som gjenstår', () => {
    actions.addByText('melk');
    actions.addByText('brød');
    actions.toggleEntry(getState().list[0]!.id);

    expect(buildWidgetSnapshot(getState()).remaining).toBe(1);
  });

  it('følger butikkrekkefølgen som er stilt inn', () => {
    actions.addByText('melk');   // meieri
    actions.addByText('agurk');  // frukt & grønt

    // Standardløypa har frukt & grønt før meieri.
    const standard = buildWidgetSnapshot(getState());
    expect(standard.list[0]!.name).toBe('Agurk');

    const snudd = [...getState().settings.categoryOrder].reverse();
    actions.updateSettings({ categoryOrder: snudd });

    expect(buildWidgetSnapshot(getState()).list[0]!.name).toBe('Melk');
  });

  it('viser mengde bare når den sier noe', () => {
    actions.addByText('melk 2 l');
    actions.addByText('agurk');

    const rows = buildWidgetSnapshot(getState()).list;
    expect(rows.find((row) => row.name === 'Melk')!.qty).toBe('2 l');
    expect(rows.find((row) => row.name === 'Agurk')!.qty).toBe('');
  });

  it('er tomt for en app som ikke har lært noe ennå', () => {
    actions.addByText('melk');
    expect(buildWidgetSnapshot(getState()).suggestions).toHaveLength(0);
  });
});

describe('forslagene widgeten får', () => {
  beforeEach(() => actions.resetAll());

  it('sender med når hvert forslag skal dukke opp', () => {
    // To kjøp med sju dagers mellomrom, det siste for to dager siden.
    actions.addByText('melk');
    const itemId = getState().items[0]!.id;
    const nå = Date.now();
    actions.replaceState({
      ...getState(),
      list: [],
      items: getState().items.map((item) =>
        item.id === itemId ? { ...item, history: [nå - 9 * DAY, nå - 2 * DAY] } : item,
      ),
    });

    const [forslag] = buildWidgetSnapshot(getState()).suggestions;
    expect(forslag).toBeDefined();
    expect(forslag!.name).toBe('Melk');
    expect(forslag!.why).toBe('omtrent ukentlig');
    // Ikke forfalt ennå: widgeten venter til 85 % av intervallet har gått.
    expect(forslag!.suggestAt).toBeGreaterThan(nå);
  });

  it('holder tilbake varer som er slått av eller utsatt', () => {
    actions.addByText('melk');
    const itemId = getState().items[0]!.id;
    const nå = Date.now();
    actions.replaceState({
      ...getState(),
      list: [],
      items: getState().items.map((item) =>
        item.id === itemId ? { ...item, history: [nå - 14 * DAY, nå - 7 * DAY] } : item,
      ),
    });
    expect(buildWidgetSnapshot(getState()).suggestions).toHaveLength(1);

    actions.setAutoSuggest(itemId, false);
    expect(buildWidgetSnapshot(getState()).suggestions).toHaveLength(0);

    actions.setAutoSuggest(itemId, true);
    actions.snoozeSuggestion(itemId, 3);
    expect(buildWidgetSnapshot(getState()).suggestions).toHaveLength(0);
  });
});
