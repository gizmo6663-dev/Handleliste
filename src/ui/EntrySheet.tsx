import { useState } from 'react';
import { CATEGORIES } from '../lib/categories.ts';
import { describeInterval, predict } from '../lib/suggestions.ts';
import { actions, useApp } from '../lib/store.ts';
import { relativeDays } from '../lib/util.ts';
import type { CategoryId } from '../lib/types.ts';
import { Sheet } from './Sheet.tsx';
import { IconStar, IconTrash } from './icons.tsx';

interface EntrySheetProps {
  entryId: string;
  onClose: () => void;
}

/** Detaljer for én linje: antall, notat, kategori og hva appen har lært. */
export function EntrySheet({ entryId, onClose }: EntrySheetProps) {
  const state = useApp();
  const entry = state.list.find((candidate) => candidate.id === entryId);
  const item = state.items.find((candidate) => candidate.id === entry?.itemId);
  const [name, setName] = useState(item?.name ?? '');

  if (!entry || !item) return null;

  const prediction = predict(item, Date.now(), state.settings);
  const registrations = item.history.length;

  return (
    <Sheet
      title={item.name}
      subtitle={
        prediction
          ? `Du pleier å kjøpe denne ${describeInterval(prediction.intervalDays)}.`
          : `Registrert ${registrations} ${registrations === 1 ? 'gang' : 'ganger'} — appen trenger minst 2 før den foreslår noe.`
      }
      onClose={onClose}
    >
      <label className="field">
        <span className="field-label">Navn</span>
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => actions.renameItem(item.id, name)}
        />
      </label>

      <div className="field">
        <span className="field-label">Antall</span>
        <div className="stepper">
          <button
            type="button"
            aria-label="Færre"
            onClick={() => actions.setQty(entry.id, entry.qty - 1)}
          >
            −
          </button>
          <span className="value">
            {entry.qty}
            {entry.unit && entry.unit !== 'stk' ? ` ${entry.unit}` : ''}
          </span>
          <button
            type="button"
            aria-label="Flere"
            onClick={() => actions.setQty(entry.id, entry.qty + 1)}
          >
            +
          </button>
        </div>
      </div>

      <label className="field">
        <span className="field-label">Notat</span>
        <input
          className="input"
          defaultValue={entry.note ?? ''}
          placeholder="F.eks. «den blå», «uten sukker»"
          onBlur={(event) => actions.setNote(entry.id, event.target.value)}
        />
      </label>

      <label className="field">
        <span className="field-label">Kategori</span>
        <select
          className="select"
          value={item.category}
          onChange={(event) => actions.setItemCategory(item.id, event.target.value as CategoryId)}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon}  {cat.name}
            </option>
          ))}
        </select>
      </label>

      {prediction && (
        <p className="hint-text">
          Sist lagt til {relativeDays(prediction.lastAt)}. Neste gang trolig{' '}
          {relativeDays(prediction.dueAt)}.
        </p>
      )}

      <div className="btn-row" style={{ marginTop: 18 }}>
        <button
          type="button"
          className="btn ghost"
          aria-pressed={Boolean(item.favorite)}
          onClick={() => actions.toggleFavorite(item.id)}
        >
          <IconStar size={18} filled={Boolean(item.favorite)} />
          {item.favorite ? 'Favoritt' : 'Gjør til favoritt'}
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => actions.setAutoSuggest(item.id, item.autoSuggest === false)}
        >
          {item.autoSuggest === false ? 'Slå på forslag' : 'Slutt å foreslå'}
        </button>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            actions.removeEntry(entry.id);
            onClose();
          }}
        >
          <IconTrash size={18} />
          Fjern fra lista
        </button>
      </div>
    </Sheet>
  );
}
