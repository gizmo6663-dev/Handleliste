import { useMemo, useRef, useState } from 'react';
import { category, dictionaryNames, guessCategory, normalize } from '../lib/categories.ts';
import { parseInput } from '../lib/parse.ts';
import { actions, useApp } from '../lib/store.ts';
import { tap } from '../lib/util.ts';
import { IconPlus } from './icons.tsx';

interface Option {
  label: string;
  hint: string;
  itemId?: string;
}

/**
 * Hurtiginput nederst på skjermen. Forstår «2 l melk» og foreslår varer
 * fra egen katalog først, deretter fra den innebygde ordboka.
 */
export function Composer() {
  const state = useApp();
  const [value, setValue] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo<Option[]>(() => {
    const parsed = parseInput(value);
    const query = normalize(parsed.name);
    if (query.length < 1) return [];

    const inList = new Set(state.list.map((entry) => entry.itemId));
    const own = state.items
      .filter((item) => !item.archived && item.key.includes(query) && !inList.has(item.id))
      .sort((a, b) => {
        const aStarts = a.key.startsWith(query) ? 0 : 1;
        const bStarts = b.key.startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return b.purchases - a.purchases;
      })
      .slice(0, 6)
      .map<Option>((item) => ({
        label: item.name,
        hint: category(item.category).name,
        itemId: item.id,
      }));

    const known = new Set(own.map((option) => normalize(option.label)));
    const fromDictionary = dictionaryNames()
      .filter((name) => name.startsWith(query) && !known.has(name))
      .slice(0, 4)
      .map<Option>((name) => ({
        label: name.charAt(0).toUpperCase() + name.slice(1),
        hint: category(guessCategory(name)).name,
      }));

    return [...own, ...fromDictionary].slice(0, 7);
  }, [value, state.items, state.list]);

  function submit(option?: Option): void {
    const parsed = parseInput(value);
    if (option?.itemId) {
      actions.addItem(option.itemId);
    } else {
      const text = option
        ? [parsed.qty > 1 ? String(parsed.qty) : '', parsed.unit ?? '', option.label]
            .filter(Boolean)
            .join(' ')
        : value;
      if (!parseInput(text).name.trim()) return;
      actions.addByText(text);
    }
    tap();
    setValue('');
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  }

  return (
    <div className="composer">
      <form
        style={{ position: 'relative' }}
        onSubmit={(event) => {
          event.preventDefault();
          submit(open && options[active] ? options[active] : undefined);
        }}
      >
        {open && options.length > 0 && (
          <div className="suggest-menu" role="listbox" aria-label="Forslag til varer">
            {options.map((option, index) => (
              <button
                key={`${option.label}-${index}`}
                type="button"
                role="option"
                aria-selected={index === active}
                data-active={index === active}
                className="suggest-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => submit(option)}
              >
                <span>{option.label}</span>
                <span className="hint">{option.hint}</span>
              </button>
            ))}
          </div>
        )}

        <div className="composer-shell">
          <input
            ref={inputRef}
            value={value}
            placeholder="Legg til vare …"
            aria-label="Legg til vare"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => {
              setValue(event.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(event) => {
              if (!open || options.length === 0) return;
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((index) => (index + 1) % options.length);
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((index) => (index - 1 + options.length) % options.length);
              } else if (event.key === 'Escape') {
                setOpen(false);
              }
            }}
          />
          <button
            type="submit"
            className="composer-submit"
            disabled={!value.trim()}
            aria-label="Legg til"
          >
            <IconPlus size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
