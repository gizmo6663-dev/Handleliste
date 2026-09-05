import { describe, expect, it } from 'vitest';
import { formatQty, parseInput } from './parse.ts';

describe('parseInput', () => {
  it('tolker bart varenavn', () => {
    expect(parseInput('melk')).toEqual({ name: 'melk', qty: 1 });
  });

  it('tolker antall foran navnet', () => {
    expect(parseInput('3 bananer')).toEqual({ name: 'bananer', qty: 3 });
  });

  it('tolker antall og enhet foran navnet', () => {
    expect(parseInput('2 l melk')).toEqual({ name: 'melk', qty: 2, unit: 'l' });
  });

  it('tolker mengde bakerst', () => {
    expect(parseInput('kjøttdeig 400 g')).toEqual({ name: 'kjøttdeig', qty: 400, unit: 'g' });
  });

  it('tolker sammenskrevet mengde', () => {
    expect(parseInput('kjøttdeig 400g')).toEqual({ name: 'kjøttdeig', qty: 400, unit: 'g' });
    expect(parseInput('500g kaffe')).toEqual({ name: 'kaffe', qty: 500, unit: 'g' });
  });

  it('tolker ganger-notasjon', () => {
    expect(parseInput('3x yoghurt')).toEqual({ name: 'yoghurt', qty: 3 });
    expect(parseInput('3 x yoghurt')).toEqual({ name: 'yoghurt', qty: 3 });
  });

  it('tolker tallord', () => {
    expect(parseInput('to agurker')).toEqual({ name: 'agurker', qty: 2 });
  });

  it('tolker antall bakerst uten enhet', () => {
    expect(parseInput('egg 12')).toEqual({ name: 'egg', qty: 12 });
  });

  it('skiller ut notat etter komma', () => {
    expect(parseInput('melk, den blå')).toEqual({ name: 'melk', qty: 1, note: 'den blå' });
  });

  it('tolker antall og notat sammen', () => {
    expect(parseInput('2 pk kaffe, helst mørkbrent')).toEqual({
      name: 'kaffe',
      qty: 2,
      unit: 'pk',
      note: 'helst mørkbrent',
    });
  });

  it('lar flerordsnavn stå urørt', () => {
    expect(parseInput('rød paprika')).toEqual({ name: 'rød paprika', qty: 1 });
  });

  it('bruker desimalkomma', () => {
    expect(parseInput('1,5 l saft')).toEqual({ name: 'saft', qty: 1.5, unit: 'l' });
  });

  it('spiser ikke opp navnet når det bare er ett ord med tall', () => {
    expect(parseInput('7up')).toEqual({ name: '7up', qty: 1 });
  });
});

describe('formatQty', () => {
  it('skjuler «stk» og enkeltantall', () => {
    expect(formatQty(1)).toBe('1');
    expect(formatQty(3, 'stk')).toBe('3');
  });

  it('viser enhet når den finnes', () => {
    expect(formatQty(2, 'l')).toBe('2 l');
    expect(formatQty(1.5, 'kg')).toBe('1,5 kg');
  });
});
