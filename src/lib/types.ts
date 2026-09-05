/** Alle datatyper appen lagrer. Alt bor lokalt på enheten (localStorage). */

export type CategoryId =
  | 'frukt-gront'
  | 'brod'
  | 'meieri'
  | 'palegg'
  | 'kjott-fisk'
  | 'middag'
  | 'torrvarer'
  | 'hermetikk'
  | 'frys'
  | 'snacks'
  | 'drikke'
  | 'husholdning'
  | 'hygiene'
  | 'dyr'
  | 'annet';

/**
 * En vare i katalogen. Katalogen er appens hukommelse: den lever videre
 * etter at handleturen er ferdig, og er grunnlaget for forslagene.
 */
export interface CatalogItem {
  id: string;
  /** Visningsnavn slik brukeren skrev det, f.eks. «Lettmelk». */
  name: string;
  /** Normalisert navn brukt til oppslag og duplikatsjekk. */
  key: string;
  category: CategoryId;
  /** Foretrukket enhet, f.eks. «l» eller «stk». */
  unit?: string;
  /** Antall som fylles inn automatisk neste gang. */
  defaultQty?: number;
  /**
   * Tidspunktene varen er lagt i lista (ms siden epoch, stigende).
   * Dette er signalet forslagsmotoren lærer av.
   */
  history: number[];
  /** Antall fullførte handleturer varen har vært med på. */
  purchases: number;
  favorite?: boolean;
  /** Slå av forslag for akkurat denne varen. */
  autoSuggest?: boolean;
  /** Ikke foreslå igjen før dette tidspunktet. */
  snoozedUntil?: number;
  /** Skjult fra hurtigvalg, men historikken beholdes. */
  archived?: boolean;
  createdAt: number;
}

export type EntrySource = 'manuell' | 'forslag' | 'favoritt' | 'gjentakelse';

/** En linje i den aktive handlelista. */
export interface ListEntry {
  id: string;
  itemId: string;
  qty: number;
  unit?: string;
  note?: string;
  checked: boolean;
  addedAt: number;
  checkedAt?: number;
  source: EntrySource;
}

/** En fullført handletur, tatt vare på for innsikt og angring. */
export interface Trip {
  id: string;
  completedAt: number;
  entries: Array<{
    itemId: string;
    name: string;
    category: CategoryId;
    qty: number;
    unit?: string;
    checked: boolean;
  }>;
}

export type ThemePreference = 'system' | 'lys' | 'mork';

export interface Settings {
  theme: ThemePreference;
  /** Rekkefølgen kategoriene vises i — tilpass til butikkens løype. */
  categoryOrder: CategoryId[];
  /** Vis forslag når det er gått denne andelen av intervallet (0,5–1,2). */
  leadFactor: number;
  /** Maks antall forslag som vises av gangen. */
  maxSuggestions: number;
  /** Minste antall registreringer før en vare kan foreslås (aldri under 2). */
  minObservations: number;
  /** Vis den diskrete forslagsstripa øverst i lista. */
  showSuggestionStrip: boolean;
  /** Flytt avkryssede varer ned i egen «I kurven»-seksjon. */
  groupChecked: boolean;
  haptics: boolean;
  /**
   * Uker før startvarene du aldri har brukt forsvinner fra widgeten.
   * 0 beholder dem for alltid. Dine egne varer rammes aldri av dette —
   * de har rytmer appen har lært, og noen av dem er sesongvarer.
   */
  starterItemWeeks: number;
}

export interface AppState {
  version: number;
  /**
   * Når startvarene ble tilgjengelige. Fristen for å rydde dem bort
   * regnes herfra.
   */
  starterItemsSince?: number;
  items: CatalogItem[];
  list: ListEntry[];
  trips: Trip[];
  settings: Settings;
}
