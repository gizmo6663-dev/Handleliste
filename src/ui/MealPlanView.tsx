import { useMemo, useState } from 'react';
import {
  addWeeks,
  dayName,
  isoDate,
  mealsOn,
  recipeOf,
  shortDate,
  startOfWeek,
  weekDays,
  weekNumber,
} from '../lib/meals.ts';
import { actions, useApp } from '../lib/store.ts';
import { tap } from '../lib/util.ts';
import { Sheet } from './Sheet.tsx';
import { RecipeSheet } from './RecipeSheet.tsx';
import { TopBar } from './TopBar.tsx';
import { toast } from './toast.tsx';
import { IconBag, IconChevron, IconPlus } from './icons.tsx';

export function MealPlanView() {
  const state = useApp();
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [openRecipe, setOpenRecipe] = useState<{ recipeId: string; mealId?: string } | null>(null);

  const days = useMemo(() => weekDays(monday), [monday]);
  const today = isoDate(new Date());
  const thisWeek = startOfWeek(new Date()).getTime() === monday.getTime();

  // Hva som mangler på lista for uka som vises.
  const uhandlet = useMemo(
    () => state.meals.filter((meal) => days.includes(meal.date) && !meal.shoppedAt),
    [state.meals, days],
  );

  return (
    <>
      <TopBar title="Meny" subtitle={`Uke ${weekNumber(monday)}`}>
        {!thisWeek && (
          <button
            type="button"
            className="btn ghost"
            style={{ padding: '7px 13px' }}
            onClick={() => setMonday(startOfWeek(new Date()))}
          >
            I dag
          </button>
        )}
      </TopBar>

      <main className="page">
        <div className="week-nav">
          <button
            type="button"
            className="icon-button"
            aria-label="Forrige uke"
            onClick={() => setMonday(addWeeks(monday, -1))}
          >
            <IconChevron dir="left" size={20} />
          </button>
          <span className="week-label">
            {shortDate(days[0]!)} – {shortDate(days[6]!)}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Neste uke"
            onClick={() => setMonday(addWeeks(monday, 1))}
          >
            <IconChevron size={20} />
          </button>
        </div>

        {uhandlet.length > 0 && (
          <button
            type="button"
            className="btn primary block"
            style={{ marginTop: 12 }}
            onClick={() => {
              const antall = actions.addMealsToList(uhandlet.map((meal) => meal.id));
              tap([10, 40, 14]);
              toast(
                antall > 0
                  ? `La ${antall} ${antall === 1 ? 'vare' : 'varer'} på lista`
                  : 'Alt lå på lista fra før',
                { label: 'Angre', run: () => actions.undo() },
              );
            }}
          >
            <IconBag size={18} />
            Legg hele uka på lista
          </button>
        )}

        {days.map((date) => {
          const meals = mealsOn(state.meals, date);
          return (
            <section className={date === today ? 'day today' : 'day'} key={date}>
              <h2 className="day-head">
                <span>{dayName(date)}</span>
                <span className="day-date">{shortDate(date)}</span>
              </h2>

              <div className="day-body">
                {meals.map((meal) => {
                  const recipe = recipeOf(state.recipes, meal);
                  if (!recipe) return null;
                  return (
                    <button
                      type="button"
                      className={meal.shoppedAt ? 'meal shopped' : 'meal'}
                      key={meal.id}
                      onClick={() => setOpenRecipe({ recipeId: recipe.id, mealId: meal.id })}
                    >
                      <span className="meal-name">{recipe.name}</span>
                      <span className="meal-meta">
                        {meal.shoppedAt
                          ? 'på lista'
                          : `${recipe.items.length} ${recipe.items.length === 1 ? 'vare' : 'varer'}`}
                      </span>
                    </button>
                  );
                })}

                <button type="button" className="meal-add" onClick={() => setPickFor(date)}>
                  <IconPlus size={17} />
                  {meals.length === 0 ? 'Sett opp en rett' : 'Én til'}
                </button>
              </div>
            </section>
          );
        })}

        <section className="section">
          <h2 className="section-head">
            <span>Mine retter</span>
            <span className="count">{state.recipes.length}</span>
          </h2>
          {state.recipes.length === 0 ? (
            <p className="hint-text" style={{ margin: '0 4px' }}>
              Du har ingen retter ennå. Sett opp en dag over, så lager du den første der.
            </p>
          ) : (
            <div className="card">
              {[...state.recipes]
                .sort((a, b) => b.timesPlanned - a.timesPlanned || a.name.localeCompare(b.name, 'nb'))
                .map((recipe) => (
                  <button
                    type="button"
                    className="suggestion-card"
                    style={{ width: '100%', textAlign: 'left' }}
                    key={recipe.id}
                    onClick={() => setOpenRecipe({ recipeId: recipe.id })}
                  >
                    <span aria-hidden style={{ fontSize: '1.2rem' }}>
                      🍽️
                    </span>
                    <div className="setting-text">
                      <div className="setting-title">{recipe.name}</div>
                      <div className="setting-desc">
                        {recipe.items.length} {recipe.items.length === 1 ? 'vare' : 'varer'}
                        {recipe.timesPlanned > 0 ? ` · ${recipe.timesPlanned} ganger` : ''}
                      </div>
                    </div>
                    <IconChevron />
                  </button>
                ))}
            </div>
          )}
        </section>
      </main>

      {pickFor && (
        <RecipePicker
          date={pickFor}
          onClose={() => setPickFor(null)}
          onEdit={(recipeId, mealId) => {
            setPickFor(null);
            setOpenRecipe(mealId ? { recipeId, mealId } : { recipeId });
          }}
        />
      )}

      {openRecipe && (
        <RecipeSheet
          key={openRecipe.recipeId}
          recipeId={openRecipe.recipeId}
          mealId={openRecipe.mealId}
          onClose={() => setOpenRecipe(null)}
        />
      )}
    </>
  );
}

interface RecipePickerProps {
  date: string;
  onClose: () => void;
  onEdit: (recipeId: string, mealId?: string) => void;
}

/** Velg en rett til en dag, eller lag en ny på stedet. */
function RecipePicker({ date, onClose, onEdit }: RecipePickerProps) {
  const state = useApp();
  const [draft, setDraft] = useState('');

  const retter = useMemo(
    () =>
      [...state.recipes].sort(
        (a, b) => b.timesPlanned - a.timesPlanned || a.name.localeCompare(b.name, 'nb'),
      ),
    [state.recipes],
  );

  return (
    <Sheet title={dayName(date)} subtitle={shortDate(date)} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const recipe = actions.createRecipe(draft);
          if (!recipe) return;
          const meal = actions.planMeal(date, recipe.id);
          setDraft('');
          onClose();
          // Ny rett er tom, så gå rett til å fylle den.
          onEdit(recipe.id, meal?.id);
        }}
      >
        <div className="composer-shell" style={{ boxShadow: 'none', marginBottom: 16 }}>
          <input
            value={draft}
            placeholder="Ny rett …"
            aria-label="Ny rett"
            autoComplete="off"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="composer-submit" disabled={!draft.trim()} aria-label="Lag rett">
            <IconPlus size={20} />
          </button>
        </div>
      </form>

      {retter.length > 0 && (
        <div className="card">
          {retter.map((recipe) => (
            <button
              type="button"
              className="suggestion-card"
              style={{ width: '100%', textAlign: 'left' }}
              key={recipe.id}
              onClick={() => {
                actions.planMeal(date, recipe.id);
                tap();
                onClose();
              }}
            >
              <span aria-hidden style={{ fontSize: '1.2rem' }}>
                🍽️
              </span>
              <div className="setting-text">
                <div className="setting-title">{recipe.name}</div>
                <div className="setting-desc">
                  {recipe.items.length} {recipe.items.length === 1 ? 'vare' : 'varer'}
                </div>
              </div>
              <IconPlus size={18} />
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
