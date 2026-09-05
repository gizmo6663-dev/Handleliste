import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORY_ORDER, guessCategory, normalize } from './categories.ts';
import { migrate } from './storage.ts';

describe('guessCategory', () => {
  it('kjenner igjen vanlige varer', () => {
    expect(guessCategory('melk')).toBe('meieri');
    expect(guessCategory('Bananer')).toBe('frukt-gront');
    expect(guessCategory('grovbrød')).toBe('brod');
    expect(guessCategory('kyllingfilet')).toBe('kjott-fisk');
    expect(guessCategory('toalettpapir')).toBe('husholdning');
    expect(guessCategory('tannkrem')).toBe('hygiene');
  });

  it('finner kategori i flerordsnavn', () => {
    expect(guessCategory('økologisk lettmelk')).toBe('meieri');
    expect(guessCategory('rød paprika')).toBe('frukt-gront');
  });

  it('takler bøyde former', () => {
    expect(guessCategory('epler')).toBe('frukt-gront');
    expect(guessCategory('tomatene')).toBe('frukt-gront');
  });

  it('faller tilbake på ordslutt for ukjente varer', () => {
    expect(guessCategory('havresaft')).toBe('drikke');
    expect(guessCategory('bestemorbrød')).toBe('brod');
    expect(guessCategory('geitost')).toBe('palegg');
  });

  it('bruker «annet» når ingenting passer', () => {
    expect(guessCategory('xyzzy')).toBe('annet');
  });
});

describe('normalize', () => {
  it('gir samme nøkkel uavhengig av skrivemåte', () => {
    expect(normalize('  Lettmelk. ')).toBe('lettmelk');
    expect(normalize('Melk,  fersk')).toBe('melk fersk');
  });
});

describe('migrate', () => {
  it('gir tom tilstand for søppelinput', () => {
    expect(migrate(null).items).toEqual([]);
    expect(migrate('nope').list).toEqual([]);
  });

  it('fyller alltid ut komplett kategorirekkefølge', () => {
    const state = migrate({ settings: { categoryOrder: ['brod', 'brod', 'ukjent'] } });
    expect(state.settings.categoryOrder).toHaveLength(DEFAULT_CATEGORY_ORDER.length);
    expect(state.settings.categoryOrder[0]).toBe('brod');
  });

  it('kaster listelinjer som peker på varer som ikke finnes', () => {
    const state = migrate({
      items: [{ id: 'a', name: 'Melk', key: 'melk', category: 'meieri', history: [], purchases: 0 }],
      list: [
        { id: 'e1', itemId: 'a', qty: 1, checked: false, addedAt: 1, source: 'manuell' },
        { id: 'e2', itemId: 'borte', qty: 1, checked: false, addedAt: 1, source: 'manuell' },
      ],
    });
    expect(state.list).toHaveLength(1);
  });

  it('tvinger minst to observasjoner uansett hva som er lagret', () => {
    expect(migrate({ settings: { minObservations: 1 } }).settings.minObservations).toBe(2);
  });

  it('setter ukjent kategori til «annet»', () => {
    const state = migrate({
      items: [{ id: 'a', name: 'Rart', key: 'rart', category: 'tull', history: [], purchases: 0 }],
    });
    expect(state.items[0]!.category).toBe('annet');
  });
});
