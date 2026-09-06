import { category, normalize } from './categories.ts';
import type { CategoryId } from './types.ts';

/**
 * Emoji per vare, så flisene i widgeten viser hva varen er — ikke bare
 * hvilken hylle den står i.
 *
 * Kategoriikonet duger som fallback, men gjør at fire fliser på rad kan vise
 * samme salatblad. Her er det som finnes et rimelig treff for.
 *
 * Nøklene er normaliserte navn. Oppslaget prøver hele navnet først, så
 * enkeltord, så ordslutt — samme framgangsmåte som kategorigjettingen.
 */
const ICONS: Record<string, string> = {};

function register(icon: string, names: string[]): void {
  for (const name of names) ICONS[name] = icon;
}

// Frukt og grønt
register('🥬', ['salat', 'isbergsalat', 'kål', 'hodekål', 'grønnkål', 'spinat', 'rukola']);
register('🥦', ['brokkoli', 'rosenkål']);
register('🥒', ['agurk', 'sylteagurk', 'squash']);
register('🍅', ['tomat', 'tomater', 'cherrytomater']);
register('🥕', ['gulrot', 'gulrøtter']);
register('🧅', ['løk', 'rødløk', 'vårløk', 'sjalottløk', 'purre', 'purreløk']);
register('🧄', ['hvitløk']);
register('🥔', ['potet', 'poteter', 'søtpotet']);
register('🌶️', ['chili', 'paprika']);
register('🍄', ['sopp', 'champignon']);
register('🍆', ['aubergine']);
register('🥑', ['avokado']);
register('🍌', ['banan', 'bananer']);
register('🍎', ['eple', 'epler']);
register('🍐', ['pære', 'pærer']);
register('🍊', ['appelsin', 'appelsiner', 'clementiner', 'clementin', 'mandarin', 'mandariner']);
register('🍋', ['sitron', 'lime']);
register('🍇', ['druer']);
register('🍓', ['jordbær']);
register('🫐', ['blåbær', 'bringebær', 'bær']);
register('🍉', ['vannmelon', 'melon']);
register('🍍', ['ananas']);
register('🥭', ['mango']);
register('🥝', ['kiwi']);
register('🍑', ['fersken', 'nektarin', 'aprikos']);
register('🌽', ['mais']);
register('🫑', ['fennikel']);
register('🌿', ['basilikum', 'persille', 'koriander', 'dill', 'gressløk', 'urter']);
register('🫚', ['ingefær']);
register('🥗', ['frukt', 'grønnsaker', 'sukkererter', 'asparges', 'selleri', 'pastinakk', 'rødbete']);

// Brød og bakevarer
register('🍞', ['brød', 'grovbrød', 'rugbrød', 'surdeigsbrød', 'toastbrød', 'loff', 'kneipp']);
register('🥖', ['baguett', 'bagett', 'ciabatta', 'focaccia']);
register('🥐', ['croissant', 'wienerbrød']);
register('🥯', ['rundstykker', 'rundstykke', 'hamburgerbrød', 'pølsebrød', 'polarbrød']);
register('🫓', ['pitabrød', 'pita', 'tortilla', 'tortillalefser', 'naanbrød', 'lefse', 'lompe', 'lomper']);
register('🍪', ['knekkebrød', 'kjeks', 'kavring']);
register('🧁', ['muffins', 'skolebrød', 'boller', 'bolle', 'kanelbolle']);
register('🍰', ['kake']);

// Meieri og egg
register('🥛', ['melk', 'lettmelk', 'helmelk', 'skummet', 'kulturmelk', 'surmelk', 'kefir', 'havremelk', 'soyamelk', 'mandelmelk', 'laktosefri']);
register('🥚', ['egg']);
register('🧈', ['smør', 'margarin', 'brelett', 'smørgo']);
register('🍶', ['fløte', 'kremfløte', 'matfløte', 'rømme', 'seterrømme', 'crème fraîche', 'creme fraiche']);
register('🍦', ['yoghurt', 'skyr', 'kesam', 'kvarg', 'cottage']);
register('🍮', ['vaniljesaus']);

// Pålegg og ost
register('🧀', ['ost', 'gulost', 'brunost', 'norvegia', 'jarlsberg', 'brie', 'chevre', 'kremost', 'krydderost', 'pultost']);
register('🥓', ['bacon', 'spekeskinke']);
register('🍖', ['skinke', 'salami', 'servelat', 'roastbiff']);
register('🥫', ['leverpostei', 'kaviar', 'makrell', 'makrell i tomat', 'prim']);
register('🍯', ['honning', 'syltetøy']);
register('🥜', ['peanøttsmør', 'nugatti', 'sjokoladepålegg']);
register('🥄', ['majones', 'snadder']);

// Kjøtt og fisk
register('🍗', ['kylling', 'kyllingfilet', 'kyllinglår', 'kalkun']);
register('🥩', ['biff', 'entrecôte', 'indrefilet', 'kjøttdeig', 'karbonadedeig', 'medisterdeig', 'strimlet', 'svinefilet', 'lammekjøtt', 'lammelår', 'kjøtt']);
register('🍖', ['koteletter', 'svinekoteletter', 'nakkekoteletter', 'ribbe', 'pinnekjøtt', 'kjøttkaker', 'kjøttboller', 'karbonader']);
register('🌭', ['pølser', 'grillpølser', 'wienerpølser']);
register('🐟', ['fisk', 'torsk', 'sei', 'kveite', 'ørret', 'fiskekaker', 'fiskepudding']);
register('🍣', ['laks', 'røkelaks', 'sushi']);
register('🍤', ['reker', 'scampi']);
register('🍔', ['hamburger']);

// Middag og ferdigmat
register('🍕', ['pizza', 'grandiosa', 'ferdigpizza', 'pizzabunn', 'frysepizza']);
register('🍝', ['lasagne', 'pastasaus', 'spaghetti', 'tagliatelle', 'penne', 'pasta', 'makaroni']);
register('🌮', ['taco', 'tacolefser', 'tacokrydder']);
register('🍲', ['suppe', 'suppepose', 'gryte', 'wok', 'woksaus', 'fiskegrateng', 'pytt']);
register('🥧', ['pai']);
register('🥞', ['pannekaker', 'vaffelrøre', 'vafler']);

// Tørrvarer og baking
register('☕', ['kaffe', 'kaffekapsler']);
register('🍵', ['te']);
register('🍚', ['ris', 'risotto', 'couscous', 'bulgur', 'quinoa', 'byggryn']);
register('🍜', ['nudler']);
register('🌾', ['mel', 'hvetemel', 'rugmel', 'havremel', 'havregryn', 'gryn']);
register('🥣', ['müsli', 'musli', 'frokostblanding', 'cornflakes', 'grøt']);
register('🧂', ['salt', 'pepper', 'krydder', 'buljong', 'fond']);
register('🍬', ['sukker', 'melis', 'vaniljesukker']);
register('🫒', ['olje', 'olivenolje', 'rapsolje', 'oliven']);
register('🥜', ['mandler', 'nøtter', 'valnøtter', 'cashew', 'solsikkefrø', 'chiafrø']);
register('🍫', ['kakao', 'sjokoladebiter']);
register('🍇', ['rosiner']);
register('🧪', ['bakepulver', 'natron', 'gjær']);

// Hermetikk og saus
register('🍅', ['ketchup', 'tomatpuré', 'tomatpure', 'hakkede tomater']);
register('🫙', ['sennep', 'dressing', 'bearnaise', 'bearnaisesaus', 'aioli', 'remulade', 'pesto', 'hummus', 'salsa', 'chilisaus', 'sriracha', 'soyasaus', 'eddik']);
register('🥫', ['hermetikk', 'tunfisk', 'kikerter', 'bønner', 'linser', 'kokosmelk', 'ansjos', 'rødkål', 'agurksalat']);

// Frysevarer
register('🍨', ['is', 'iskrem', 'softis']);
register('🍟', ['pommes', 'frites', 'pommes frites']);
register('🐠', ['fiskepinner']);
register('🫛', ['erter', 'frosne erter', 'ertepuré']);
register('🧊', ['frossen', 'frosne', 'frosne bær']);

// Snacks og godteri
register('🍫', ['sjokolade', 'kvikklunsj', 'daim', 'twist', 'marabou', 'freia', 'sjokoladeplate']);
register('🍬', ['godteri', 'smågodt', 'lørdagsgodt', 'seigmenn', 'bamsemums', 'nonstop', 'lakris']);
register('🍿', ['popcorn']);
register('🥔', ['potetgull', 'chips', 'ostepop', 'nachos']);
register('🥨', ['saltstenger', 'salte pinner']);

// Drikke
register('🥤', ['brus', 'cola', 'pepsi', 'fanta', 'sprite', 'solo', 'urge', 'energidrikk']);
register('🧃', ['juice', 'appelsinjuice', 'eplejuice', 'saft', 'iste', 'smoothie']);
register('💧', ['vann', 'mineralvann', 'farris']);
register('🍺', ['øl', 'pils', 'sider']);
register('🍷', ['vin', 'musserende']);

// Husholdning
register('🧻', ['toalettpapir', 'dopapir', 'husholdningspapir', 'tørkerull', 'servietter']);
register('🧼', ['oppvaskmiddel', 'oppvasktabletter', 'zalo', 'håndsåpe', 'grønnsåpe']);
register('🧽', ['svamp', 'kluter', 'oppvaskbørste']);
register('🧴', ['vaskemiddel', 'skyllemiddel', 'rengjøringsmiddel', 'universalrens', 'gulvvask']);
register('🗑️', ['søppelposer', 'bæreposer', 'plastposer']);
register('🕯️', ['stearinlys', 'lys', 'fyrstikker']);
register('💡', ['lyspære']);
register('🔋', ['batterier']);
register('📄', ['bakepapir', 'matpapir', 'aluminiumsfolie', 'gladpack']);

// Hygiene og apotek
register('🧴', ['sjampo', 'shampoo', 'balsam', 'dusjsåpe', 'bodylotion', 'fuktighetskrem', 'håndkrem', 'intimsåpe', 'solkrem']);
register('🪥', ['tannbørste', 'tannkrem', 'tanntråd']);
register('💊', ['paracet', 'ibux', 'vitaminer', 'tran', 'neseespray']);
register('🩹', ['plaster']);
register('🧷', ['bleier', 'bind', 'tamponger']);
register('🪒', ['barberblad', 'barberskum']);
register('👃', ['deodorant']);
register('🧻', ['våtservietter', 'q-tips']);

// Dyr
register('🐕', ['hundemat', 'hundegodbiter', 'tyggebein']);
register('🐈', ['kattemat', 'kattesand', 'kattestrø']);
register('🐦', ['fuglefrø']);

/**
 * Emoji for en vare. Faller tilbake på kategoriens ikon når vi ikke har
 * noe bedre — det er alltid riktig, bare mindre spesifikt.
 */
export function itemIcon(name: string, categoryId: CategoryId): string {
  const key = normalize(name);
  const direct = ICONS[key];
  if (direct) return direct;

  const words = key.split(' ');
  for (const word of words) {
    const hit = ICONS[word];
    if (hit) return hit;
    // «bananer» → «banan», «eplene» → «eple», «tomatene» → «tomat»
    for (const ending of ['ene', 'er', 'en', 'et', 'ne', 'a']) {
      if (word.length > ending.length + 2 && word.endsWith(ending)) {
        const stem = ICONS[word.slice(0, -ending.length)];
        if (stem) return stem;
      }
    }
  }

  // Sammensatte navn: «havresaft» treffer «saft», «geitost» treffer «ost».
  for (const [candidate, icon] of Object.entries(ICONS)) {
    if (candidate.length >= 4 && key.endsWith(candidate)) return icon;
  }

  return category(categoryId).icon;
}
