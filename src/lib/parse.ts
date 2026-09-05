/** Tolker fritekst som «2 l melk» eller «kjøttdeig 500 g» til struktur. */

export interface ParsedInput {
  name: string;
  qty: number;
  unit?: string;
  note?: string;
}

/** Kjente enheter, skrevet slik brukeren typisk taster dem. */
const UNITS: Record<string, string> = {
  stk: 'stk',
  st: 'stk',
  kg: 'kg',
  hg: 'hg',
  g: 'g',
  gram: 'g',
  l: 'l',
  liter: 'l',
  dl: 'dl',
  cl: 'cl',
  ml: 'ml',
  pk: 'pk',
  pakke: 'pk',
  pakker: 'pk',
  boks: 'boks',
  bokser: 'boks',
  pose: 'pose',
  poser: 'pose',
  flaske: 'flaske',
  flasker: 'flaske',
  glass: 'glass',
  beger: 'beger',
  ss: 'ss',
  ts: 'ts',
  kartong: 'kartong',
  brett: 'brett',
  neve: 'neve',
  bunt: 'bunt',
};

const NUMBER_WORDS: Record<string, number> = {
  en: 1,
  ett: 1,
  to: 2,
  tre: 3,
  fire: 4,
  fem: 5,
  seks: 6,
  sju: 7,
  syv: 7,
  åtte: 8,
  ni: 9,
  ti: 10,
  dusin: 12,
};

function toNumber(token: string): number | null {
  const cleaned = token.replace(',', '.');
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    const value = Number(cleaned);
    return Number.isFinite(value) && value > 0 && value < 1000 ? value : null;
  }
  const word = NUMBER_WORDS[token.toLowerCase()];
  return word ?? null;
}

/**
 * Deler input i antall, enhet, navn og notat.
 * Notat skrives etter komma eller bindestrek: «melk, den blå».
 */
export function parseInput(raw: string): ParsedInput {
  const trimmed = raw.trim();
  if (!trimmed) return { name: '', qty: 1 };

  let working = trimmed;
  let note: string | undefined;

  const noteMatch = working.match(/^(.*?)\s*(?:,|\s-\s)\s*(.+)$/);
  if (noteMatch?.[1] && noteMatch[2] && !toNumber(noteMatch[2].split(' ')[0] ?? '')) {
    working = noteMatch[1];
    note = noteMatch[2].trim();
  }

  // «3x brød» og «3 x brød»
  working = working.replace(/^(\d+(?:[.,]\d+)?)\s*x\s+/i, '$1 ');

  let qty: number | null = null;
  let unit: string | undefined;

  const tokens = working.split(/\s+/).filter(Boolean);

  // Mønster A: tall (+ enhet) foran navnet — «2 l melk», «3 bananer».
  const leadingNumber = toNumber(tokens[0] ?? '');
  if (leadingNumber !== null && tokens.length > 1) {
    qty = leadingNumber;
    tokens.shift();
    const maybeUnit = UNITS[(tokens[0] ?? '').toLowerCase()];
    if (maybeUnit && tokens.length > 1) {
      unit = maybeUnit;
      tokens.shift();
    }
  } else {
    // Mønster B: «500 g» eller «2 stk» limt sammen — «kjøttdeig 500g».
    const glued = tokens[0]?.match(/^(\d+(?:[.,]\d+)?)([a-zæøå]+)$/i);
    if (glued?.[1] && glued[2] && UNITS[glued[2].toLowerCase()] && tokens.length > 1) {
      qty = toNumber(glued[1]);
      unit = UNITS[glued[2].toLowerCase()];
      tokens.shift();
    }
  }

  // Mønster C: mengden står bakerst — «kjøttdeig 400 g», «melk 2 l», «egg 12».
  if (qty === null && tokens.length > 1) {
    const last = tokens[tokens.length - 1] ?? '';
    const secondLast = tokens[tokens.length - 2] ?? '';
    const lastUnit = UNITS[last.toLowerCase()];
    const lastNumber = toNumber(last);
    const glued = last.match(/^(\d+(?:[.,]\d+)?)([a-zæøå]+)$/i);

    if (lastUnit && toNumber(secondLast) !== null && tokens.length > 2) {
      unit = lastUnit;
      qty = toNumber(secondLast);
      tokens.splice(-2, 2);
    } else if (glued?.[1] && glued[2] && UNITS[glued[2].toLowerCase()]) {
      qty = toNumber(glued[1]);
      unit = UNITS[glued[2].toLowerCase()];
      tokens.pop();
    } else if (lastNumber !== null && /^\d/.test(last)) {
      qty = lastNumber;
      tokens.pop();
    }
  }

  const name = tokens.join(' ').trim();
  const result: ParsedInput = {
    name: name || trimmed,
    qty: qty && qty > 0 ? qty : 1,
  };
  if (unit) result.unit = unit;
  if (note) result.note = note;
  return result;
}

/** «2 l» / «500 g» / «3» — formaterer mengde for visning. */
export function formatQty(qty: number, unit?: string): string {
  const rounded = Number.isInteger(qty) ? String(qty) : String(qty).replace('.', ',');
  if (!unit || unit === 'stk') return rounded;
  return `${rounded} ${unit}`;
}
