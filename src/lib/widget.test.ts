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

describe('katalogen widgeten plukker fra', () => {
  beforeEach(() => actions.resetAll());

  it('tar med både egne og vanlige varer, med kategori', () => {
    actions.addByText('melk');

    const { catalog } = buildWidgetSnapshot(getState());
    expect(catalog.find((row) => row.name === 'Melk')!.categoryId).toBe('meieri');
    // Vanlige varer er med fra start, ellers ville kategoriene vært tomme.
    expect(catalog.find((row) => row.name === 'Brokkoli')!.categoryId).toBe('frukt-gront');
    expect(catalog.find((row) => row.name === 'Toalettpapir')!.categoryId).toBe('husholdning');
  });

  it('gir egne varer en id, og vanlige varer bare et navn', () => {
    actions.addByText('melk');

    const { catalog } = buildWidgetSnapshot(getState());
    expect(catalog.find((row) => row.name === 'Melk')!.itemId).not.toBe('');
    // Uten id må appen opprette varen når trykket kommer inn.
    expect(catalog.find((row) => row.name === 'Brokkoli')!.itemId).toBe('');
  });

  it('viser ikke en vanlig vare dobbelt når du alt har den', () => {
    const før = buildWidgetSnapshot(getState()).catalog.filter((r) => r.name === 'Kaffe');
    expect(før).toHaveLength(1);

    actions.addByText('kaffe');

    const etter = buildWidgetSnapshot(getState()).catalog.filter(
      (row) => row.name.toLowerCase() === 'kaffe',
    );
    expect(etter).toHaveLength(1);
    expect(etter[0]!.itemId).not.toBe('');
  });

  it('markerer varer som allerede ligger på lista', () => {
    actions.addByText('melk');
    const itemId = getState().items[0]!.id;
    expect(buildWidgetSnapshot(getState()).catalog[0]!.onList).toBe(true);

    // Fullfør turen: varen er kjent, men ikke lenger på lista.
    actions.toggleEntry(getState().list[0]!.id);
    actions.completeTrip();

    const row = buildWidgetSnapshot(getState()).catalog.find((r) => r.itemId === itemId)!;
    expect(row.onList).toBe(false);
  });

  it('setter de mest kjøpte varene først', () => {
    actions.addByText('melk');
    actions.addByText('kaviar');
    // Kjøp melk to ganger, kaviar én.
    for (const entry of getState().list) actions.toggleEntry(entry.id);
    actions.completeTrip();
    actions.addByText('melk');
    actions.toggleEntry(getState().list[0]!.id);
    actions.completeTrip();

    expect(buildWidgetSnapshot(getState()).catalog[0]!.name).toBe('Melk');
  });

  it('sender kategoriene i butikkens rekkefølge', () => {
    const { categories } = buildWidgetSnapshot(getState());
    expect(categories).toHaveLength(getState().settings.categoryOrder.length);
    expect(categories[0]!.id).toBe(getState().settings.categoryOrder[0]);
    expect(categories[0]!.name).toBe('Frukt & grønt');

    const snudd = [...getState().settings.categoryOrder].reverse();
    actions.updateSettings({ categoryOrder: snudd });
    expect(buildWidgetSnapshot(getState()).categories[0]!.id).toBe(snudd[0]);
  });

  it('utelater arkiverte varer', () => {
    actions.addByText('melk');
    const itemId = getState().items[0]!.id;
    expect(buildWidgetSnapshot(getState()).catalog.some((r) => r.name === 'Melk')).toBe(true);

    actions.replaceState({
      ...getState(),
      items: getState().items.map((item) =>
        item.id === itemId ? { ...item, archived: true } : item,
      ),
    });

    expect(buildWidgetSnapshot(getState()).catalog.some((r) => r.name === 'Melk')).toBe(false);
  });

  it('har noe å tilby i hver kategori fra første stund', () => {
    const { catalog, categories } = buildWidgetSnapshot(getState());
    // «Annet» er med vilje tom — den er en oppsamlingsplass, ikke en hylle.
    const medVarer = categories.filter((c) =>
      catalog.some((row) => row.categoryId === c.id && !row.onList),
    );
    expect(medVarer.length).toBe(categories.length - 1);
  });

  it('markerer egne varer som ligger på lista', () => {
    actions.addByText('melk');
    const rad = buildWidgetSnapshot(getState()).catalog.find((r) => r.name === 'Melk')!;
    expect(rad.onList).toBe(true);
  });
});

describe('vanlige varer plukket fra en kategori', () => {
  beforeEach(() => actions.resetAll());

  it('opprettes med gjettet kategori og tidspunktet fra trykket', () => {
    const iGar = Date.now() - DAY;

    // Slik køen utføres når appen tømmer den etter et widget-trykk.
    actions.addByText('Brokkoli', 'forslag', iGar);

    const item = getState().items.find((candidate) => candidate.name === 'Brokkoli')!;
    expect(item.category).toBe('frukt-gront');
    expect(item.history).toEqual([iGar]);
    expect(getState().list[0]!.source).toBe('forslag');
  });

  it('forsvinner fra kategorien når den er lagt til', () => {
    actions.addByText('Brokkoli', 'forslag');

    const rad = buildWidgetSnapshot(getState()).catalog.find((r) => r.name === 'Brokkoli')!;
    expect(rad.onList).toBe(true);
    expect(rad.itemId).not.toBe('');
  });
});

describe('rydding av startvarer', () => {
  const UKE = 7 * DAY;
  beforeEach(() => actions.resetAll());

  /** Flytter tidspunktet startvarene kom inn så mange uker tilbake. */
  function startvarerAlder(uker: number): void {
    actions.replaceState({ ...getState(), starterItemsSince: Date.now() - uker * UKE });
  }

  it('beholder startvarene innenfor fristen', () => {
    startvarerAlder(5);
    expect(buildWidgetSnapshot(getState()).catalog.some((r) => r.itemId === '')).toBe(true);
  });

  it('fjerner ubrukte startvarer når fristen er ute', () => {
    startvarerAlder(7);
    expect(buildWidgetSnapshot(getState()).catalog.some((r) => r.itemId === '')).toBe(false);
  });

  it('lar dine egne varer stå selv når fristen er ute', () => {
    actions.addByText('melk');
    actions.toggleEntry(getState().list[0]!.id);
    actions.completeTrip();
    startvarerAlder(20);

    const katalog = buildWidgetSnapshot(getState()).catalog;
    expect(katalog.some((r) => r.name === 'Melk')).toBe(true);
    expect(katalog.every((r) => r.itemId !== '')).toBe(true);
  });

  it('beholder en startvare du har tatt i bruk, som din egen', () => {
    // Plukket fra en kategori i widgeten.
    actions.addByText('Brokkoli', 'forslag');
    actions.toggleEntry(getState().list[0]!.id);
    actions.completeTrip();
    startvarerAlder(20);

    const rad = buildWidgetSnapshot(getState()).catalog.find((r) => r.name === 'Brokkoli');
    expect(rad).toBeDefined();
    expect(rad!.itemId).not.toBe('');
  });

  it('lar deg slå ryddingen helt av', () => {
    startvarerAlder(52);
    actions.updateSettings({ starterItemWeeks: 0 });
    expect(buildWidgetSnapshot(getState()).catalog.some((r) => r.itemId === '')).toBe(true);
  });

  it('følger antallet uker som er stilt inn', () => {
    startvarerAlder(10);
    actions.updateSettings({ starterItemWeeks: 12 });
    expect(buildWidgetSnapshot(getState()).catalog.some((r) => r.itemId === '')).toBe(true);

    actions.updateSettings({ starterItemWeeks: 8 });
    expect(buildWidgetSnapshot(getState()).catalog.some((r) => r.itemId === '')).toBe(false);
  });
});

describe('rekkefølgen på dine egne varer', () => {
  beforeEach(() => actions.resetAll());

  /** Legger inn en vare med gitt antall kjøp og tid siden sist. */
  function vare(navn: string, kjøp: number, ukerSiden: number): void {
    actions.addByText(navn);
    const item = getState().items.find((i) => i.key === navn.toLowerCase())!;
    const sist = Date.now() - ukerSiden * 7 * DAY;
    actions.replaceState({
      ...getState(),
      list: [],
      items: getState().items.map((i) =>
        i.id === item.id ? { ...i, purchases: kjøp, history: [sist] } : i,
      ),
    });
  }

  it('setter det du kjøper ofte og nylig øverst', () => {
    vare('kaffe', 10, 1);
    vare('pinnekjøtt', 2, 40);

    const egne = buildWidgetSnapshot(getState()).catalog.filter((r) => r.itemId !== '');
    expect(egne[0]!.name).toBe('Kaffe');
  });

  it('lar en sesongvare synke, men aldri forsvinne', () => {
    vare('kaffe', 10, 1);
    vare('pinnekjøtt', 2, 40);

    const egne = buildWidgetSnapshot(getState()).catalog.filter((r) => r.itemId !== '');
    expect(egne.map((r) => r.name)).toContain('Pinnekjøtt');
    expect(egne[egne.length - 1]!.name).toBe('Pinnekjøtt');
  });
});
