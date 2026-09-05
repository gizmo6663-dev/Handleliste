import { useEffect, useMemo, useState } from 'react';
import { buildSuggestions } from './lib/suggestions.ts';
import { actions, useApp } from './lib/store.ts';
import { InsightsView } from './ui/InsightsView.tsx';
import { ListView } from './ui/ListView.tsx';
import { SettingsView } from './ui/SettingsView.tsx';
import { SuggestionsView } from './ui/SuggestionsView.tsx';
import { WidgetView } from './ui/WidgetView.tsx';
import { Toaster, toast } from './ui/toast.tsx';
import { IconChart, IconGear, IconList, IconSpark } from './ui/icons.tsx';

type Route = 'liste' | 'forslag' | 'innsikt' | 'innstillinger' | 'widget';

const ROUTES: Record<string, Route> = {
  '': 'liste',
  '/': 'liste',
  '/forslag': 'forslag',
  '/innsikt': 'innsikt',
  '/innstillinger': 'innstillinger',
  '/widget': 'widget',
};

function readRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '').split('?')[0] ?? '';
  return ROUTES[hash] ?? 'liste';
}

/**
 * Plukker opp varer som kommer utenfra: delingsmål, iOS-snarveier
 * eller lenker på formen `#/legg-til?vare=melk`.
 */
function consumeIncomingItem(): void {
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  const hashQuery = hash.includes('?') ? new URLSearchParams(hash.slice(hash.indexOf('?') + 1)) : null;

  const raw =
    hashQuery?.get('vare') ??
    hashQuery?.get('text') ??
    search.get('vare') ??
    search.get('text') ??
    search.get('title');

  if (!raw?.trim()) return;

  // Flere varer kan komme i én lenke, skilt med semikolon eller linjeskift.
  const parts = raw
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  let added = 0;
  for (const part of parts) {
    if (actions.addByText(part)) added++;
  }

  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '#/';
  window.history.replaceState({}, '', url.toString());

  if (added > 0) {
    toast(added === 1 ? `La til ${parts[0]?.toLowerCase()}` : `La til ${added} varer`, {
      label: 'Angre',
      run: () => actions.undo(),
    });
  }
}

export function App() {
  const state = useApp();
  const [route, setRoute] = useState<Route>(() => readRoute());

  useEffect(() => {
    consumeIncomingItem();
    // Også ved hash-bytte: en snarvei som treffer en app som allerede er åpen,
    // laster ikke siden på nytt.
    const onHashChange = () => {
      consumeIncomingItem();
      setRoute(readRoute());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Temaet styres av en attributt på <html>, slik at CSS-en gjør resten.
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', state.settings.theme);
  }, [state.settings.theme]);

  const suggestionCount = useMemo(
    () =>
      buildSuggestions({
        items: state.items,
        inList: new Set(state.list.map((entry) => entry.itemId)),
        now: Date.now(),
        settings: state.settings,
      }).length,
    [state.items, state.list, state.settings],
  );

  function navigate(target: string): void {
    window.location.hash = `#/${target === 'liste' ? '' : target}`;
  }

  if (route === 'widget') return <WidgetView />;

  return (
    <div className="app">
      {route === 'liste' && <ListView navigate={navigate} />}
      {route === 'forslag' && <SuggestionsView />}
      {route === 'innsikt' && <InsightsView />}
      {route === 'innstillinger' && <SettingsView />}

      <nav className="nav" aria-label="Hovedmeny">
        <NavItem route="liste" current={route} label="Liste" icon={<IconList />} />
        <NavItem
          route="forslag"
          current={route}
          label="Forslag"
          icon={<IconSpark />}
          badge={suggestionCount}
        />
        <NavItem route="innsikt" current={route} label="Innsikt" icon={<IconChart />} />
        <NavItem route="innstillinger" current={route} label="Innstillinger" icon={<IconGear />} />
      </nav>

      <Toaster />
    </div>
  );
}

interface NavItemProps {
  route: Route;
  current: Route;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function NavItem({ route, current, label, icon, badge }: NavItemProps) {
  return (
    <a
      className="nav-item"
      href={`#/${route === 'liste' ? '' : route}`}
      aria-current={current === route ? 'page' : undefined}
      style={{ textDecoration: 'none' }}
    >
      {icon}
      <span>{label}</span>
      {badge ? (
        <span className="nav-badge" aria-label={`${badge} forslag`}>
          {badge}
        </span>
      ) : null}
    </a>
  );
}
