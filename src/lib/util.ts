import { getState } from './store.ts';

/** Kort vibrasjon når noe krysses av — bare hvis brukeren vil ha det. */
export function tap(pattern: number | number[] = 8): void {
  if (!getState().settings.haptics) return;
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignorert med vilje */
  }
}

const DATE = new Intl.DateTimeFormat('nb', { day: 'numeric', month: 'long' });

/**
 * «i dag», «i går», «for 3 dager siden».
 * Skrevet for hånd fordi Intl sier «om 3 døgn», som klinger teknisk på norsk.
 */
export function relativeDays(from: number, now = Date.now()): string {
  const days = Math.round((from - now) / 86_400_000);
  if (days === 0) return 'i dag';
  if (days === 1) return 'i morgen';
  if (days === 2) return 'i overmorgen';
  if (days === -1) return 'i går';
  if (days === -2) return 'i forgårs';
  if (days > 0 && days <= 30) return `om ${days} dager`;
  if (days < 0 && days >= -30) return `for ${-days} dager siden`;
  return DATE.format(from);
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
