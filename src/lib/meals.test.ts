import { beforeEach, describe, expect, it } from 'vitest';
import {
  addWeeks,
  dayName,
  fromIso,
  isoDate,
  mealsOn,
  startOfWeek,
  weekDays,
  weekNumber,
} from './meals.ts';
import { actions, getState } from './store.ts';

describe('datoene i matplanen', () => {
  it('bruker lokal dato, ikke UTC', () => {
    // 23:30 lokal tid skal fortsatt være samme dag.
    const sent = new Date(2026, 10, 11, 23, 30);
    expect(isoDate(sent)).toBe('2026-11-11');
  });

  it('leser datoen tilbake til samme dag', () => {
    expect(isoDate(fromIso('2026-01-05'))).toBe('2026-01-05');
  });

  it('lar uka begynne på mandag', () => {
    // 2026-11-11 er en onsdag.
    expect(isoDate(startOfWeek(fromIso('2026-11-11')))).toBe('2026-11-09');
    // En søndag hører til uka som startet mandagen før.
    expect(isoDate(startOfWeek(fromIso('2026-11-15')))).toBe('2026-11-09');
    // En mandag er sin egen ukestart.
    expect(isoDate(startOfWeek(fromIso('2026-11-09')))).toBe('2026-11-09');
  });

  it('gir sju dager fra mandag til søndag', () => {
    const dager = weekDays(fromIso('2026-11-09'));
    expect(dager).toHaveLength(7);
    expect(dager[0]).toBe('2026-11-09');
    expect(dager[6]).toBe('2026-11-15');
  });

  it('blar uker uten å snuble i månedsskifte', () => {
    expect(isoDate(addWeeks(fromIso('2026-11-30'), 1))).toBe('2026-12-07');
    expect(isoDate(addWeeks(fromIso('2026-01-04'), -1))).toBe('2025-12-28');
  });

  it('navngir dagene på norsk', () => {
    expect(dayName('2026-11-09')).toBe('Mandag');
    expect(dayName('2026-11-15')).toBe('Søndag');
  });

  it('regner ISO-ukenummer', () => {
    expect(weekNumber(fromIso('2026-11-09'))).toBe(46);
    // Nyttårsuka hører ofte til året før.
    expect(weekNumber(fromIso('2025-12-29'))).toBe(1);
  });
});

describe('retter og meny', () => {
  beforeEach(() => actions.resetAll());

  it('lager en rett, og gjenbruker den om navnet finnes', () => {
    const først = actions.createRecipe('Kyllingwok')!;
    const igjen = actions.createRecipe('kyllingwok')!;
    expect(igjen.id).toBe(først.id);
    expect(getState().recipes).toHaveLength(1);
  });

  it('skiller ingredienser fra tilbehør', () => {
    const rett = actions.createRecipe('Taco')!;
    actions.addRecipeItem(rett.id, 'kjøttdeig', 'ingrediens');
    actions.addRecipeItem(rett.id, 'tacolefser', 'ingrediens');
    actions.addRecipeItem(rett.id, 'rømme', 'tilbehor');

    const lagret = getState().recipes[0]!;
    expect(lagret.items.filter((e) => e.part === 'ingrediens')).toHaveLength(2);
    expect(lagret.items.filter((e) => e.part === 'tilbehor')).toHaveLength(1);
  });

  it('oppretter varer i katalogen, men uten å røre historikken', () => {
    const rett = actions.createRecipe('Taco')!;
    actions.addRecipeItem(rett.id, 'kjøttdeig');

    const vare = getState().items.find((item) => item.key === 'kjøttdeig')!;
    expect(vare.category).toBe('kjott-fisk');
    // Å skrive en vare i en oppskrift er ikke det samme som å trenge den.
    expect(vare.history).toEqual([]);
  });

  it('tolker mengde i ingrediensen', () => {
    const rett = actions.createRecipe('Taco')!;
    actions.addRecipeItem(rett.id, '400 g kjøttdeig');

    const entry = getState().recipes[0]!.items[0]!;
    expect(entry.qty).toBe(400);
    expect(entry.unit).toBe('g');
  });

  it('tar ikke inn samme vare to ganger', () => {
    const rett = actions.createRecipe('Taco')!;
    actions.addRecipeItem(rett.id, 'kjøttdeig');
    actions.addRecipeItem(rett.id, 'Kjøttdeig');
    expect(getState().recipes[0]!.items).toHaveLength(1);
  });

  it('flytter en vare mellom ingrediens og tilbehør', () => {
    const rett = actions.createRecipe('Taco')!;
    actions.addRecipeItem(rett.id, 'rømme', 'ingrediens');
    const itemId = getState().recipes[0]!.items[0]!.itemId;

    actions.setRecipeItemPart(rett.id, itemId, 'tilbehor');
    expect(getState().recipes[0]!.items[0]!.part).toBe('tilbehor');
  });

  it('fjerner en vare fra retten uten å slette den fra katalogen', () => {
    const rett = actions.createRecipe('Taco')!;
    actions.addRecipeItem(rett.id, 'kjøttdeig');
    const itemId = getState().recipes[0]!.items[0]!.itemId;

    actions.removeRecipeItem(rett.id, itemId);
    expect(getState().recipes[0]!.items).toHaveLength(0);
    expect(getState().items.some((item) => item.id === itemId)).toBe(true);
  });

  it('setter en rett på menyen en gitt dag', () => {
    const rett = actions.createRecipe('Taco')!;
    actions.planMeal('2026-11-13', rett.id);

    expect(mealsOn(getState().meals, '2026-11-13')).toHaveLength(1);
    expect(getState().recipes[0]!.timesPlanned).toBe(1);
  });

  it('tar retten av menyen igjen', () => {
    const rett = actions.createRecipe('Taco')!;
    const meal = actions.planMeal('2026-11-13', rett.id)!;

    actions.unplanMeal(meal.id);
    expect(getState().meals).toHaveLength(0);
    expect(getState().recipes[0]!.timesPlanned).toBe(0);
  });

  it('sletter en rett og tar den av menyen de dagene den sto', () => {
    const rett = actions.createRecipe('Taco')!;
    actions.planMeal('2026-11-13', rett.id);
    actions.planMeal('2026-11-20', rett.id);

    actions.deleteRecipe(rett.id);
    expect(getState().recipes).toHaveLength(0);
    expect(getState().meals).toHaveLength(0);
  });
});

describe('fra meny til handleliste', () => {
  beforeEach(() => actions.resetAll());

  function taco(): { rettId: string; mealId: string } {
    const rett = actions.createRecipe('Taco')!;
    actions.addRecipeItem(rett.id, 'kjøttdeig', 'ingrediens');
    actions.addRecipeItem(rett.id, 'tacolefser', 'ingrediens');
    actions.addRecipeItem(rett.id, 'rømme', 'tilbehor');
    const meal = actions.planMeal('2026-11-13', rett.id)!;
    return { rettId: rett.id, mealId: meal.id };
  }

  it('legger både ingredienser og tilbehør på lista', () => {
    const { mealId } = taco();
    expect(actions.addMealToList(mealId)).toBe(3);
    expect(getState().list).toHaveLength(3);
  });

  it('gir varene historikk, så rytmen læres av det du planlegger', () => {
    const { mealId } = taco();
    actions.addMealToList(mealId);

    const kjøttdeig = getState().items.find((item) => item.key === 'kjøttdeig')!;
    expect(kjøttdeig.history).toHaveLength(1);
  });

  it('merker måltidet som handlet', () => {
    const { mealId } = taco();
    actions.addMealToList(mealId);
    expect(getState().meals[0]!.shoppedAt).toBeGreaterThan(0);
  });

  it('legger ikke til varer som alt ligger på lista', () => {
    const { mealId } = taco();
    actions.addByText('kjøttdeig');
    expect(getState().list).toHaveLength(1);

    expect(actions.addMealToList(mealId)).toBe(2);
    expect(getState().list).toHaveLength(3);
  });

  it('gjør ingenting andre gang, når alt alt er lagt til', () => {
    const { mealId } = taco();
    actions.addMealToList(mealId);
    expect(actions.addMealToList(mealId)).toBe(0);
    expect(getState().list).toHaveLength(3);
  });

  it('tar med mengden fra oppskriften', () => {
    const rett = actions.createRecipe('Bolognese')!;
    actions.addRecipeItem(rett.id, '400 g kjøttdeig');
    const meal = actions.planMeal('2026-11-13', rett.id)!;

    actions.addMealToList(meal.id);
    expect(getState().list[0]!.qty).toBe(400);
    expect(getState().list[0]!.unit).toBe('g');
  });
});
