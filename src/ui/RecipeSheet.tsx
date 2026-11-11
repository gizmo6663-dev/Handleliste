import { useState } from 'react';
import { category } from '../lib/categories.ts';
import { formatQty } from '../lib/parse.ts';
import { itemIcon } from '../lib/item-icons.ts';
import { actions, useApp } from '../lib/store.ts';
import { tap } from '../lib/util.ts';
import type { RecipePart } from '../lib/types.ts';
import { Sheet } from './Sheet.tsx';
import { toast } from './toast.tsx';
import { IconBag, IconPlus, IconTrash } from './icons.tsx';

interface RecipeSheetProps {
  recipeId: string;
  /** Satt når arket åpnes fra en dag på menyen, så måltidet kan handles eller tas av. */
  mealId?: string;
  onClose: () => void;
}

/** Retten med ingredienser og tilbehør, og det man kan gjøre med den. */
export function RecipeSheet({ recipeId, mealId, onClose }: RecipeSheetProps) {
  const state = useApp();
  const recipe = state.recipes.find((candidate) => candidate.id === recipeId);
  const meal = mealId ? state.meals.find((candidate) => candidate.id === mealId) : undefined;
  const [name, setName] = useState(recipe?.name ?? '');
  const [draft, setDraft] = useState('');
  const [part, setPart] = useState<RecipePart>('ingrediens');

  if (!recipe) return null;

  const byId = new Map(state.items.map((item) => [item.id, item]));
  const grupper: Array<[RecipePart, string]> = [
    ['ingrediens', 'Ingredienser'],
    ['tilbehor', 'Tilbehør'],
  ];

  return (
    <Sheet
      title={recipe.name}
      subtitle={
        recipe.timesPlanned > 0
          ? `Har stått på menyen ${recipe.timesPlanned} ${recipe.timesPlanned === 1 ? 'gang' : 'ganger'}.`
          : 'Ny rett — legg inn det du trenger.'
      }
      onClose={onClose}
    >
      {meal && (
        <div className="btn-row" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              const antall = actions.addMealToList(meal.id);
              tap();
              toast(
                antall > 0
                  ? `La ${antall} ${antall === 1 ? 'vare' : 'varer'} på lista`
                  : 'Alt lå på lista fra før',
                { label: 'Angre', run: () => actions.undo() },
              );
              onClose();
            }}
          >
            <IconBag size={18} />
            Legg på handlelista
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              actions.unplanMeal(meal.id);
              toast('Tok av menyen', { label: 'Angre', run: () => actions.undo() });
              onClose();
            }}
          >
            Ta av menyen
          </button>
        </div>
      )}

      <label className="field">
        <span className="field-label">Navn</span>
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => actions.renameRecipe(recipe.id, name)}
        />
      </label>

      {grupper.map(([gruppe, overskrift]) => {
        const varer = recipe.items.filter((entry) => entry.part === gruppe);
        return (
          <section className="section" key={gruppe} style={{ marginTop: 14 }}>
            <h2 className="section-head">
              <span>{overskrift}</span>
              <span className="count">{varer.length}</span>
            </h2>
            {varer.length === 0 ? (
              <p className="hint-text" style={{ margin: '0 4px' }}>
                {gruppe === 'ingrediens'
                  ? 'Ingenting ennå. Skriv inn under.'
                  : 'Ikke noe tilbehør — ris, poteter, salat og slikt hører hjemme her.'}
              </p>
            ) : (
              <div className="card">
                {varer.map((entry) => {
                  const item = byId.get(entry.itemId);
                  if (!item) return null;
                  return (
                    <div className="suggestion-card" key={entry.itemId}>
                      <span aria-hidden style={{ fontSize: '1.2rem' }}>
                        {itemIcon(item.name, item.category)}
                      </span>
                      <div className="setting-text">
                        <div className="setting-title">{item.name}</div>
                        <div className="setting-desc">
                          {entry.qty || entry.unit
                            ? `${formatQty(entry.qty ?? 1, entry.unit)} · `
                            : ''}
                          {category(item.category).name}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Flytt ${item.name} til ${
                          gruppe === 'ingrediens' ? 'tilbehør' : 'ingredienser'
                        }`}
                        title={gruppe === 'ingrediens' ? 'Gjør til tilbehør' : 'Gjør til ingrediens'}
                        onClick={() =>
                          actions.setRecipeItemPart(
                            recipe.id,
                            entry.itemId,
                            gruppe === 'ingrediens' ? 'tilbehor' : 'ingrediens',
                          )
                        }
                      >
                        ⇅
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Fjern ${item.name} fra retten`}
                        onClick={() => actions.removeRecipeItem(recipe.id, entry.itemId)}
                      >
                        <IconTrash size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <form
        style={{ marginTop: 16 }}
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          actions.addRecipeItem(recipe.id, draft, part);
          setDraft('');
        }}
      >
        <div className="segmented" role="group" aria-label="Legg til som" style={{ marginBottom: 8 }}>
          {grupper.map(([gruppe, overskrift]) => (
            <button
              key={gruppe}
              type="button"
              aria-pressed={part === gruppe}
              onClick={() => setPart(gruppe)}
            >
              {overskrift}
            </button>
          ))}
        </div>
        <div className="composer-shell" style={{ boxShadow: 'none' }}>
          <input
            value={draft}
            placeholder={part === 'ingrediens' ? 'F.eks. «500 g kjøttdeig»' : 'F.eks. «ris»'}
            aria-label={part === 'ingrediens' ? 'Ny ingrediens' : 'Nytt tilbehør'}
            autoComplete="off"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="composer-submit" disabled={!draft.trim()} aria-label="Legg til">
            <IconPlus size={20} />
          </button>
        </div>
      </form>

      <div className="btn-row" style={{ marginTop: 20 }}>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            actions.deleteRecipe(recipe.id);
            toast(`Slettet ${recipe.name.toLowerCase()}`, {
              label: 'Angre',
              run: () => actions.undo(),
            });
            onClose();
          }}
        >
          <IconTrash size={18} />
          Slett retten
        </button>
      </div>
    </Sheet>
  );
}
