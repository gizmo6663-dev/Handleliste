import type { CatalogItem, Settings } from './types.ts';

export const DAY = 86_400_000;

/**
 * To registreringer nærmere hverandre enn dette regnes som samme handletur
 * (du la til melk, angret, la den til igjen) og teller bare én gang.
 */
const SAME_TRIP_WINDOW = 8 * 60 * 60 * 1000;

/** Kortere intervaller enn dette er støy; lengre er trolig et opphold. */
const MIN_INTERVAL = 0.5 * DAY;
const MAX_INTERVAL = 365 * DAY;

/** Nyere intervaller veier tyngst: vekt = DECAY^(alder i antall intervaller). */
const DECAY = 0.7;

export interface Prediction {
  itemId: string;
  /** Forventet tid mellom hver gang varen trengs, i millisekunder. */
  interval: number;
  intervalDays: number;
  /** Siste gang varen ble lagt i lista. */
  lastAt: number;
  /** Når vi tror varen trengs igjen. */
  dueAt: number;
  /** Når forslaget dukker opp (litt før forfall). */
  suggestAt: number;
  /** 1,0 = forfaller nå. Over 1 = på overtid. */
  urgency: number;
  /** 0–1. Bygger på antall observasjoner og hvor jevn rytmen er. */
  confidence: number;
  /** Antall intervaller vi har lært av. */
  cycles: number;
}

/**
 * Slår sammen registreringer som hører til samme handletur, slik at
 * historikken beskriver «ganger varen ble trengt», ikke «ganger den ble tastet».
 */
export function collapseHistory(history: readonly number[]): number[] {
  const sorted = [...history].filter((t) => Number.isFinite(t)).sort((a, b) => a - b);
  const out: number[] = [];
  for (const stamp of sorted) {
    const previous = out[out.length - 1];
    if (previous === undefined || stamp - previous > SAME_TRIP_WINDOW) {
      out.push(stamp);
    } else {
      out[out.length - 1] = stamp;
    }
  }
  return out;
}

function intervalsFrom(events: readonly number[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < events.length; i++) {
    const gap = (events[i] as number) - (events[i - 1] as number);
    if (gap >= MIN_INTERVAL && gap <= MAX_INTERVAL) result.push(gap);
  }
  return result;
}

/** Vektet snitt der de nyeste intervallene teller mest. */
function weightedMean(intervals: readonly number[]): number {
  let sum = 0;
  let weightSum = 0;
  const n = intervals.length;
  for (let i = 0; i < n; i++) {
    const weight = Math.pow(DECAY, n - 1 - i);
    sum += (intervals[i] as number) * weight;
    weightSum += weight;
  }
  return weightSum > 0 ? sum / weightSum : 0;
}

/** Variasjonskoeffisient — hvor forutsigbar rytmen er. 0 = helt jevn. */
function variationCoefficient(intervals: readonly number[], mean: number): number {
  if (intervals.length < 2 || mean <= 0) return 0;
  const variance =
    intervals.reduce((acc, value) => acc + (value - mean) ** 2, 0) / intervals.length;
  return Math.sqrt(variance) / mean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Beregner når en vare trolig trengs igjen.
 *
 * Returnerer null når vi ikke vet nok: kravet er minst to registreringer
 * (altså minst ett målt intervall) før appen tør å foreslå noe.
 */
export function predict(
  item: CatalogItem,
  now: number,
  settings: Pick<Settings, 'leadFactor' | 'minObservations'>,
): Prediction | null {
  const minObservations = Math.max(2, settings.minObservations);
  const events = collapseHistory(item.history);
  if (events.length < minObservations) return null;

  const intervals = intervalsFrom(events);
  if (intervals.length === 0) return null;

  const interval = clamp(weightedMean(intervals), MIN_INTERVAL, MAX_INTERVAL);
  const lastAt = events[events.length - 1] as number;
  const dueAt = lastAt + interval;

  const leadFactor = clamp(settings.leadFactor, 0.5, 1.2);
  const suggestAt = lastAt + interval * leadFactor;

  const cv = variationCoefficient(intervals, interval);
  // Få observasjoner gir lav sikkerhet; ujevn rytme trekker den ytterligere ned.
  const sampleConfidence = clamp(intervals.length / 4, 0.25, 1);
  const rhythmConfidence = clamp(1 - cv, 0.2, 1);

  return {
    itemId: item.id,
    interval,
    intervalDays: interval / DAY,
    lastAt,
    dueAt,
    suggestAt,
    urgency: (now - lastAt) / interval,
    confidence: clamp(sampleConfidence * rhythmConfidence, 0, 1),
    cycles: intervals.length,
  };
}

export interface SuggestionContext {
  items: readonly CatalogItem[];
  /** Vare-id-er som allerede ligger i den aktive lista. */
  inList: ReadonlySet<string>;
  now: number;
  settings: Pick<Settings, 'leadFactor' | 'minObservations' | 'maxSuggestions'>;
}

/**
 * De varene appen mener det nærmer seg at du går tom for.
 * Sortert etter hvor sikre og hvor forfalte de er.
 */
export function buildSuggestions(context: SuggestionContext): Prediction[] {
  const { items, inList, now, settings } = context;
  const suggestions: Prediction[] = [];

  for (const item of items) {
    if (item.archived) continue;
    if (item.autoSuggest === false) continue;
    if (inList.has(item.id)) continue;
    if (item.snoozedUntil && item.snoozedUntil > now) continue;

    const prediction = predict(item, now, settings);
    if (!prediction) continue;
    if (now < prediction.suggestAt) continue;

    // Er varen ekstremt på overtid har rytmen trolig endret seg — da tier vi.
    if (prediction.urgency > 3.5) continue;

    suggestions.push(prediction);
  }

  suggestions.sort((a, b) => score(b) - score(a));
  return suggestions.slice(0, Math.max(1, settings.maxSuggestions));
}

/** Rangering: forfalte og sikre varer først. */
function score(prediction: Prediction): number {
  const overdue = clamp(prediction.urgency, 0, 2);
  return overdue * (0.45 + 0.55 * prediction.confidence);
}

/** Alle varer med nok historikk, sortert etter forventet forfall. Brukes i Innsikt. */
export function forecast(
  items: readonly CatalogItem[],
  now: number,
  settings: Pick<Settings, 'leadFactor' | 'minObservations'>,
): Prediction[] {
  return items
    .filter((item) => !item.archived)
    .map((item) => predict(item, now, settings))
    .filter((prediction): prediction is Prediction => prediction !== null)
    .sort((a, b) => a.dueAt - b.dueAt);
}

/** Menneskelig beskrivelse av et intervall: «hver 4. dag», «annenhver uke». */
export function describeInterval(days: number): string {
  if (days < 1.4) return 'omtrent daglig';
  if (days < 2.6) return 'annenhver dag';
  if (days < 6) return `hver ${Math.round(days)}. dag`;
  if (days < 9) return 'omtrent ukentlig';
  if (days < 18) return 'annenhver uke';
  if (days < 45) return `hver ${Math.round(days / 7)}. uke`;
  if (days < 75) return 'omtrent månedlig';
  return `hver ${Math.round(days / 30)}. måned`;
}

/** «i dag», «om 3 dager», «for 2 dager siden». */
export function describeDue(dueAt: number, now: number): string {
  const diffDays = Math.round((dueAt - now) / DAY);
  if (diffDays === 0) return 'i dag';
  if (diffDays === 1) return 'i morgen';
  if (diffDays === -1) return 'i går';
  if (diffDays > 1) return `om ${diffDays} dager`;
  return `for ${Math.abs(diffDays)} dager siden`;
}
