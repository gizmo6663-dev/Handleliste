import { describe, expect, it } from 'vitest';
import { itemIcon } from './item-icons.ts';

describe('vareikoner', () => {
  it('gir hver vare sitt eget ikon, ikke kategoriens', () => {
    // Alle fire er «frukt & grønt», men skal se ulike ut i widgeten.
    const ikoner = [
      itemIcon('Banan', 'frukt-gront'),
      itemIcon('Gulrøtter', 'frukt-gront'),
      itemIcon('Tomater', 'frukt-gront'),
      itemIcon('Poteter', 'frukt-gront'),
    ];
    expect(new Set(ikoner).size).toBe(4);
  });

  it('kjenner igjen vanlige varer', () => {
    expect(itemIcon('Melk', 'meieri')).toBe('🥛');
    expect(itemIcon('Egg', 'meieri')).toBe('🥚');
    expect(itemIcon('Kaffe', 'torrvarer')).toBe('☕');
    expect(itemIcon('Toalettpapir', 'husholdning')).toBe('🧻');
    expect(itemIcon('Kattesand', 'dyr')).toBe('🐈');
  });

  it('takler bøyde former', () => {
    expect(itemIcon('Bananer', 'frukt-gront')).toBe(itemIcon('Banan', 'frukt-gront'));
    expect(itemIcon('Eplene', 'frukt-gront')).toBe(itemIcon('Eple', 'frukt-gront'));
  });

  it('finner ikonet i flerordsnavn', () => {
    expect(itemIcon('Økologisk lettmelk', 'meieri')).toBe('🥛');
    expect(itemIcon('Rød paprika', 'frukt-gront')).toBe('🌶️');
  });

  it('leser sammensatte navn på ordslutten', () => {
    expect(itemIcon('Geitost', 'palegg')).toBe('🧀');
    expect(itemIcon('Bestemorbrød', 'brod')).toBe('🍞');
  });

  it('faller tilbake på kategorien når vi ikke vet bedre', () => {
    expect(itemIcon('Xyzzy', 'hermetikk')).toBe('🥫');
    expect(itemIcon('Noe ukjent', 'annet')).toBe('📦');
  });
});
