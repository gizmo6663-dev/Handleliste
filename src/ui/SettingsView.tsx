import { useRef } from 'react';
import { category } from '../lib/categories.ts';
import { demoState } from '../lib/demo.ts';
import { actions, useApp } from '../lib/store.ts';
import type { ThemePreference } from '../lib/types.ts';
import { TopBar } from './TopBar.tsx';
import { toast } from './toast.tsx';
import { IconChevron } from './icons.tsx';

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function SettingsView() {
  const state = useApp();
  const { settings } = state;
  const fileInput = useRef<HTMLInputElement>(null);

  function exportData(): void {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `handleliste-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <TopBar title="Innstillinger" />

      <main className="page">
        <section className="section">
          <h2 className="section-head">
            <span>Utseende</span>
          </h2>
          <div className="segmented" role="group" aria-label="Tema">
            {(
              [
                ['system', 'System'],
                ['lys', 'Lyst'],
                ['mork', 'Mørkt'],
              ] as Array<[ThemePreference, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={settings.theme === value}
                onClick={() => actions.updateSettings({ theme: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="section">
          <h2 className="section-head">
            <span>Forslag</span>
          </h2>
          <div className="card">
            <div className="setting-row">
              <div className="setting-text">
                <div className="setting-title">Vis forslag i lista</div>
                <div className="setting-desc">
                  En diskret stripe øverst når noe nærmer seg tomt.
                </div>
              </div>
              <Switch
                label="Vis forslag i lista"
                checked={settings.showSuggestionStrip}
                onChange={(value) => actions.updateSettings({ showSuggestionStrip: value })}
              />
            </div>

            <div className="setting-row" style={{ display: 'block' }}>
              <div className="setting-title">Hvor tidlig skal appen si fra?</div>
              <div className="setting-desc" style={{ marginBottom: 8 }}>
                {settings.leadFactor <= 0.7
                  ? 'God margin — sier fra tidlig i syklusen.'
                  : settings.leadFactor >= 1
                    ? 'Sier fra først når varen trolig er tom.'
                    : `Sier fra når ${Math.round(settings.leadFactor * 100)} % av tiden har gått.`}
              </div>
              <input
                type="range"
                min={0.5}
                max={1.2}
                step={0.05}
                value={settings.leadFactor}
                aria-label="Hvor tidlig forslagene kommer"
                style={{ width: '100%', accentColor: 'var(--accent)' }}
                onChange={(event) =>
                  actions.updateSettings({ leadFactor: Number(event.target.value) })
                }
              />
            </div>

            <div className="setting-row" style={{ display: 'block' }}>
              <div className="setting-title">Maks antall forslag</div>
              <div className="setting-desc" style={{ marginBottom: 8 }}>
                {settings.maxSuggestions} om gangen
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={settings.maxSuggestions}
                aria-label="Maks antall forslag"
                style={{ width: '100%', accentColor: 'var(--accent)' }}
                onChange={(event) =>
                  actions.updateSettings({ maxSuggestions: Number(event.target.value) })
                }
              />
            </div>
          </div>
          <p className="hint-text">
            En vare må være lagt til minst to ganger før den kan foreslås — appen gjetter aldri
            på grunnlag av ett enkelt kjøp.
          </p>
        </section>

        <section className="section">
          <h2 className="section-head">
            <span>Lista</span>
          </h2>
          <div className="card">
            <div className="setting-row">
              <div className="setting-text">
                <div className="setting-title">Samle avkryssede varer</div>
                <div className="setting-desc">Flytt dem ned i «I kurven».</div>
              </div>
              <Switch
                label="Samle avkryssede varer"
                checked={settings.groupChecked}
                onChange={(value) => actions.updateSettings({ groupChecked: value })}
              />
            </div>
            <div className="setting-row">
              <div className="setting-text">
                <div className="setting-title">Vibrasjon</div>
                <div className="setting-desc">Liten respons når du krysser av.</div>
              </div>
              <Switch
                label="Vibrasjon"
                checked={settings.haptics}
                onChange={(value) => actions.updateSettings({ haptics: value })}
              />
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-head">
            <span>Butikkløype</span>
          </h2>
          <div className="card">
            {settings.categoryOrder.map((id, index) => {
              const meta = category(id);
              return (
                <div className="order-row" key={id}>
                  <span aria-hidden>{meta.icon}</span>
                  <span className="name">{meta.name}</span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Flytt ${meta.name} opp`}
                    disabled={index === 0}
                    style={{ opacity: index === 0 ? 0.3 : 1 }}
                    onClick={() => actions.moveCategory(id, -1)}
                  >
                    <IconChevron dir="up" />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Flytt ${meta.name} ned`}
                    disabled={index === settings.categoryOrder.length - 1}
                    style={{ opacity: index === settings.categoryOrder.length - 1 ? 0.3 : 1 }}
                    onClick={() => actions.moveCategory(id, 1)}
                  >
                    <IconChevron dir="down" />
                  </button>
                </div>
              );
            })}
          </div>
          <p className="hint-text">
            Sett rekkefølgen slik du går gjennom butikken, så følger lista deg.
          </p>
        </section>

        <section className="section">
          <h2 className="section-head">
            <span>Data</span>
          </h2>
          <div className="btn-row">
            <button type="button" className="btn ghost" onClick={exportData}>
              Eksporter
            </button>
            <button type="button" className="btn ghost" onClick={() => fileInput.current?.click()}>
              Importer
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                actions.replaceState(demoState());
                toast('La inn eksempeldata', { label: 'Angre', run: () => actions.undo() });
              }}
            >
              Prøv eksempeldata
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="visually-hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              try {
                actions.replaceState(JSON.parse(await file.text()));
                toast('Importerte data', { label: 'Angre', run: () => actions.undo() });
              } catch {
                toast('Klarte ikke å lese fila');
              }
            }}
          />

          <div className="btn-row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                actions.resetAll();
                toast('Alt er nullstilt', { label: 'Angre', run: () => actions.undo() });
              }}
            >
              Nullstill alt
            </button>
          </div>
          <p className="hint-text">
            Alt ligger lagret på denne enheten. Ingenting sendes til noen server, og appen
            fungerer uten nett.
          </p>
        </section>

        <section className="section">
          <h2 className="section-head">
            <span>Snarveier</span>
          </h2>
          <div className="card">
            <a className="setting-row" href="#/widget" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="setting-text">
                <div className="setting-title">Widget-visning</div>
                <div className="setting-desc">
                  Kompakt oversikt — legg den til på hjemskjermen som egen snarvei.
                </div>
              </div>
              <IconChevron />
            </a>
          </div>
          <p className="hint-text">
            Tips: <code>#/legg-til?vare=melk</code> legger til en vare direkte. Bruk den fra
            Snarveier på iOS eller en widget på Android.
          </p>
        </section>
      </main>
    </>
  );
}
