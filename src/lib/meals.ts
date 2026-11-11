import type { PlannedMeal, Recipe } from './types.ts';

/**
 * Datoer i matplanen er «ÅÅÅÅ-MM-DD» i din egen tidssone.
 *
 * Et tidsstempel ville gjort «tirsdag» avhengig av klokkeslett og sommertid;
 * en dato er det folk faktisk planlegger etter.
 */
export function isoDate(at: number | Date): string {
  const date = at instanceof Date ? at : new Date(at);
  const måned = String(date.getMonth() + 1).padStart(2, '0');
  const dag = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${måned}-${dag}`;
}

/** Gjør en datostreng om til en Date ved lokal midnatt. */
export function fromIso(date: string): Date {
  const [år, måned, dag] = date.split('-').map(Number);
  return new Date(år ?? 1970, (måned ?? 1) - 1, dag ?? 1);
}

/** Mandagen i uka datoen ligger i. Norske uker starter på mandag. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay() gir 0 for søndag; vi vil ha mandag som 0.
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  return result;
}

/** De sju dagene i uka som starter på `monday`. */
export function weekDays(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
    return isoDate(day);
  });
}

export function addWeeks(monday: Date, count: number): Date {
  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + count * 7);
}

const DAG = new Intl.DateTimeFormat('nb', { weekday: 'long' });
const DAG_KORT = new Intl.DateTimeFormat('nb', { weekday: 'short' });
const DATO = new Intl.DateTimeFormat('nb', { day: 'numeric', month: 'short' });

export function dayName(date: string): string {
  const navn = DAG.format(fromIso(date));
  return navn.charAt(0).toUpperCase() + navn.slice(1);
}

export function shortDayName(date: string): string {
  return DAG_KORT.format(fromIso(date)).replace('.', '');
}

export function shortDate(date: string): string {
  return DATO.format(fromIso(date)).replace('.', '');
}

/** ISO-ukenummer, som er det folk sier når de planlegger. */
export function weekNumber(monday: Date): number {
  const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
  // Torsdagen i samme uke avgjør hvilket år og uke ISO regner den til.
  date.setDate(date.getDate() + 3);
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  const uker = Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return uker + 1;
}

/** Måltidene på en gitt dag, i den rekkefølgen de ble lagt inn. */
export function mealsOn(meals: readonly PlannedMeal[], date: string): PlannedMeal[] {
  return meals.filter((meal) => meal.date === date);
}

/** Retten et måltid viser til. */
export function recipeOf(
  recipes: readonly Recipe[],
  meal: PlannedMeal,
): Recipe | undefined {
  return recipes.find((recipe) => recipe.id === meal.recipeId);
}
