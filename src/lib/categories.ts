import type { CategoryId } from './types.ts';

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  icon: string;
  /** CSS-variabel-navn for kategoriens aksentfarge. */
  hue: number;
}

/** Standardrekkefølgen følger løypa i en typisk norsk dagligvarebutikk. */
export const CATEGORIES: CategoryMeta[] = [
  { id: 'frukt-gront', name: 'Frukt & grønt', icon: '🥬', hue: 128 },
  { id: 'brod', name: 'Brød & bakevarer', icon: '🥖', hue: 34 },
  { id: 'meieri', name: 'Meieri & egg', icon: '🥛', hue: 202 },
  { id: 'palegg', name: 'Pålegg & ost', icon: '🧀', hue: 44 },
  { id: 'kjott-fisk', name: 'Kjøtt & fisk', icon: '🥩', hue: 355 },
  { id: 'middag', name: 'Middag & ferdigmat', icon: '🍝', hue: 18 },
  { id: 'torrvarer', name: 'Tørrvarer & baking', icon: '🌾', hue: 40 },
  { id: 'hermetikk', name: 'Hermetikk & saus', icon: '🥫', hue: 8 },
  { id: 'frys', name: 'Frysevarer', icon: '🧊', hue: 190 },
  { id: 'snacks', name: 'Snacks & godteri', icon: '🍫', hue: 320 },
  { id: 'drikke', name: 'Drikke', icon: '🧃', hue: 265 },
  { id: 'husholdning', name: 'Husholdning', icon: '🧻', hue: 172 },
  { id: 'hygiene', name: 'Hygiene & apotek', icon: '🧴', hue: 300 },
  { id: 'dyr', name: 'Dyr', icon: '🐾', hue: 90 },
  { id: 'annet', name: 'Annet', icon: '📦', hue: 220 },
];

export const DEFAULT_CATEGORY_ORDER: CategoryId[] = CATEGORIES.map((c) => c.id);

const BY_ID = new Map<CategoryId, CategoryMeta>(CATEGORIES.map((c) => [c.id, c]));

export function category(id: CategoryId): CategoryMeta {
  return BY_ID.get(id) ?? BY_ID.get('annet')!;
}

/**
 * Ordbok for automatisk kategorisering. Nøklene er normaliserte ord;
 * oppslaget skjer først på hele navnet, så på enkeltord, så på ordslutt.
 */
const DICTIONARY: Record<string, CategoryId> = {};

function register(cat: CategoryId, words: string[]): void {
  for (const word of words) DICTIONARY[word] = cat;
}

register('frukt-gront', [
  'agurk', 'ananas', 'appelsin', 'appelsiner', 'aubergine', 'avokado', 'banan', 'bananer',
  'basilikum', 'blomkål', 'blåbær', 'bringebær', 'brokkoli', 'chili', 'clementin',
  'clementiner', 'druer', 'dill', 'eple', 'epler', 'fennikel', 'gulrot', 'gulrøtter',
  'grønnkål', 'hodekål', 'hvitløk', 'ingefær', 'isbergsalat', 'jordbær', 'kiwi', 'koriander',
  'kål', 'lime', 'løk', 'mandarin', 'mandariner', 'mango', 'melon', 'nektarin', 'paprika',
  'pastinakk', 'pepperrot', 'persille', 'pære', 'pærer', 'plomme', 'plommer', 'poteter',
  'potet', 'purre', 'purreløk', 'reddik', 'rosenkål', 'rødbete', 'rødløk', 'salat',
  'sitron', 'sjalottløk', 'sopp', 'spinat', 'squash', 'sukkererter', 'søtpotet', 'tomat',
  'tomater', 'vannmelon', 'vårløk', 'aprikos', 'fersken', 'frukt', 'grønnsaker', 'urter',
  'champignon', 'gressløk', 'mais', 'erter', 'bønner', 'asparges', 'selleri', 'rukola',
]);

register('brod', [
  'baguett', 'bagett', 'bolle', 'boller', 'brød', 'ciabatta', 'flatbrød', 'focaccia',
  'grovbrød', 'hamburgerbrød', 'horn', 'knekkebrød', 'kneipp', 'lefse', 'loff', 'muffins',
  'naanbrød', 'pita', 'pitabrød', 'polarbrød', 'rundstykker', 'rundstykke', 'rugbrød',
  'skolebrød', 'surdeigsbrød', 'tortilla', 'tortillalefser', 'wienerbrød', 'kake',
  'kanelbolle', 'kavring', 'croissant', 'toastbrød', 'pølsebrød',
]);

register('meieri', [
  'crème', 'creme', 'cottage', 'egg', 'fløte', 'helmelk', 'kefir', 'kesam', 'kremfløte',
  'kulturmelk', 'lettmelk', 'matfløte', 'melk', 'rømme', 'seterrømme', 'skummet', 'skyr',
  'smør', 'smørgo', 'sourcream', 'surmelk', 'yoghurt', 'kvarg', 'havremelk', 'soyamelk',
  'mandelmelk', 'laktosefri', 'vaniljesaus', 'margarin', 'brelett', 'creamcheese',
]);

register('palegg', [
  'brie', 'brunost', 'chevre', 'gulost', 'jarlsberg', 'kaviar', 'leverpostei', 'majones',
  'makrell', 'nugatti', 'norvegia', 'ost', 'peanøttsmør', 'prim', 'pålegg', 'salami',
  'servelat', 'skinke', 'snadder', 'spekeskinke', 'sjokoladepålegg', 'syltetøy', 'honning',
  'kokt', 'roastbiff', 'krydderost', 'pultost', 'kremost',
]);

register('kjott-fisk', [
  'bacon', 'biff', 'entrecôte', 'fiskekaker', 'fiskepudding', 'grillpølser', 'hamburger',
  'indrefilet', 'karbonader', 'kjøttdeig', 'kjøttkaker', 'kylling', 'kyllingfilet',
  'kyllinglår', 'lammelår', 'laks', 'medisterdeig', 'ribbe', 'reker', 'røkelaks', 'scampi',
  'sei', 'svinekoteletter', 'sausages', 'torsk', 'pølser', 'pinnekjøtt', 'kalkun',
  'kjøtt', 'fisk', 'ørret', 'kveite', 'koteletter', 'strimlet', 'kjøttboller', 'lammekjøtt',
  'svinefilet', 'nakkekoteletter', 'wienerpølser',
]);

register('middag', [
  'grandiosa', 'lasagne', 'pizza', 'pizzabunn', 'ferdigmiddag', 'suppe', 'taco',
  'tacokrydder', 'tacolefser', 'wok', 'woksaus', 'sushi', 'salatbar', 'gryte', 'pai',
  'pastasaus', 'fiskegrateng', 'pytt', 'pannekaker',
]);

register('torrvarer', [
  'bakepulver', 'byggryn', 'couscous', 'gjær', 'havregryn', 'hvetemel', 'kakao', 'kaffe',
  'kokosmelk', 'linser', 'makaroni', 'mel', 'müsli', 'musli', 'nudler', 'pasta', 'penne',
  'ris', 'risotto', 'rugmel', 'salt', 'spaghetti', 'sukker', 'te', 'tagliatelle', 'quinoa',
  'bulgur', 'cornflakes', 'frokostblanding', 'grøt', 'havremel', 'melis', 'natron',
  'pepper', 'krydder', 'vaniljesukker', 'sjokoladebiter', 'rosiner', 'mandler', 'nøtter',
  'valnøtter', 'cashew', 'solsikkefrø', 'chiafrø', 'olje', 'olivenolje', 'rapsolje',
  'eddik', 'buljong', 'fond',
]);

register('hermetikk', [
  'bønnersaus', 'hermetikk', 'ketchup', 'sennep', 'soyasaus', 'sriracha', 'tomatpuré',
  'tomatpure', 'hakkede', 'kokosmelk boks', 'ansjos', 'oliven', 'agurksalat', 'rødkål',
  'sylteagurk', 'dressing', 'bearnaise', 'chilisaus', 'salsa', 'hummus', 'pesto',
  'tunfisk', 'kikerter', 'mais boks', 'aioli', 'remulade',
]);

register('frys', [
  'fiskepinner', 'frossen', 'frosne', 'is', 'iskrem', 'pommes', 'frites', 'lompe',
  'bær frossen', 'ertepuré', 'frysepizza', 'softis',
]);

register('snacks', [
  'chips', 'daim', 'dip', 'freia', 'godteri', 'kjeks', 'kvikklunsj', 'lakris', 'lørdagsgodt',
  'marabou', 'nonstop', 'popcorn', 'potetgull', 'saltstenger', 'seigmenn', 'sjokolade',
  'smågodt', 'snacks', 'twist', 'ostepop', 'bamsemums', 'nachos', 'sjokoladeplate',
]);

register('drikke', [
  'brus', 'cola', 'eplejuice', 'energidrikk', 'farris', 'fanta', 'juice', 'kaffekapsler',
  'mineralvann', 'musserende', 'pepsi', 'saft', 'solo', 'sprite', 'urge', 'vann', 'vin',
  'øl', 'smoothie', 'iste', 'appelsinjuice', 'kakao drikke', 'sider', 'drikke',
]);

register('husholdning', [
  'aluminiumsfolie', 'bakepapir', 'batterier', 'blomsterjord', 'bæreposer', 'dopapir',
  'gladpack', 'grillkull', 'husholdningspapir', 'kluter', 'lyspære', 'lys', 'matpapir',
  'oppvaskmiddel', 'oppvasktabletter', 'plastposer', 'rengjøringsmiddel', 'servietter',
  'skyllemiddel', 'stearinlys', 'søppelposer', 'tørkerull', 'vaskemiddel', 'zalo',
  'toalettpapir', 'gulvvask', 'universalrens', 'oppvaskbørste', 'svamp', 'fyrstikker',
]);

register('hygiene', [
  'balsam', 'bind', 'bleier', 'bodylotion', 'deodorant', 'dusjsåpe', 'håndsåpe', 'ibux',
  'intimsåpe', 'kondomer', 'paracet', 'plaster', 'q-tips', 'sjampo', 'shampoo', 'solkrem',
  'tannbørste', 'tannkrem', 'tanntråd', 'tamponger', 'våtservietter', 'barberblad',
  'barberskum', 'fuktighetskrem', 'håndkrem', 'vitaminer', 'tran', 'neseespray',
]);

register('dyr', [
  'hundemat', 'kattemat', 'kattesand', 'hundegodbiter', 'fuglefrø', 'dyrefôr', 'tyggebein',
  'kattestrø', 'fôr',
]);

/** Ordslutt-heuristikker som fanger opp varer ordboka ikke kjenner. */
const SUFFIX_RULES: Array<[string, CategoryId]> = [
  ['saft', 'drikke'],
  ['juice', 'drikke'],
  ['brus', 'drikke'],
  ['vann', 'drikke'],
  ['øl', 'drikke'],
  ['brød', 'brod'],
  ['bolle', 'brod'],
  ['boller', 'brod'],
  ['kake', 'brod'],
  ['ost', 'palegg'],
  ['postei', 'palegg'],
  ['pålegg', 'palegg'],
  ['syltetøy', 'palegg'],
  ['melk', 'meieri'],
  ['fløte', 'meieri'],
  ['yoghurt', 'meieri'],
  ['rømme', 'meieri'],
  ['filet', 'kjott-fisk'],
  ['pølser', 'kjott-fisk'],
  ['deig', 'kjott-fisk'],
  ['kaker', 'kjott-fisk'],
  ['koteletter', 'kjott-fisk'],
  ['saus', 'hermetikk'],
  ['dressing', 'hermetikk'],
  ['krydder', 'torrvarer'],
  ['mel', 'torrvarer'],
  ['gryn', 'torrvarer'],
  ['pasta', 'torrvarer'],
  ['olje', 'torrvarer'],
  ['bær', 'frukt-gront'],
  ['salat', 'frukt-gront'],
  ['løk', 'frukt-gront'],
  ['papir', 'husholdning'],
  ['middel', 'husholdning'],
  ['såpe', 'hygiene'],
  ['krem', 'hygiene'],
  ['sjampo', 'hygiene'],
  ['mat', 'dyr'],
];

/** Gjør et navn om til en sammenlignbar nøkkel: små bokstaver, uten fyllord. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,;:!?()"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Gjetter kategori ut fra varenavn. Treffer den ikke, havner varen i «Annet»
 * — og brukeren kan flytte den, hvilket appen husker via katalogen.
 */
export function guessCategory(name: string): CategoryId {
  const key = normalize(name);
  if (!key) return 'annet';

  const direct = DICTIONARY[key];
  if (direct) return direct;

  const words = key.split(' ');
  for (const word of words) {
    const hit = DICTIONARY[word];
    if (hit) return hit;
    // «bananer» → «banan», «eplene» → «eple»
    for (const ending of ['ene', 'er', 'en', 'et', 'a']) {
      if (word.length > ending.length + 2 && word.endsWith(ending)) {
        const stem = word.slice(0, -ending.length);
        const stemHit = DICTIONARY[stem];
        if (stemHit) return stemHit;
      }
    }
  }

  for (const [suffix, cat] of SUFFIX_RULES) {
    if (key.endsWith(suffix)) return cat;
  }
  for (const [suffix, cat] of SUFFIX_RULES) {
    if (key.includes(suffix)) return cat;
  }

  return 'annet';
}

/** Alle kjente varenavn — brukes til autofullføring for helt nye brukere. */
export function dictionaryNames(): string[] {
  return Object.keys(DICTIONARY);
}
