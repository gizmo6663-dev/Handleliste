import type { CategoryId } from './types.ts';

/**
 * Vanlige norske dagligvarer, til å bla gjennom i widgeten og legge til uten
 * å skrive.
 *
 * Dette er en annen liste enn ordboka i categories.ts. Den ordboka finnes for
 * å gjette kategori og inneholder derfor også nøkkelord som «kokt» og
 * «mais boks» — nyttige å kjenne igjen, men ubrukelige å bla i. Her står bare
 * ting man faktisk plukker fra en hylle.
 *
 * Lista er et utgangspunkt: dine egne varer kommer alltid først, og alt du
 * legger til selv blir med videre.
 */
export const COMMON_ITEMS: Record<CategoryId, string[]> = {
  'frukt-gront': [
    'Agurk', 'Ananas', 'Appelsiner', 'Aubergine', 'Avokado', 'Bananer', 'Basilikum',
    'Blomkål', 'Blåbær', 'Bringebær', 'Brokkoli', 'Champignon', 'Chili', 'Clementiner',
    'Druer', 'Eple', 'Gulrøtter', 'Hvitløk', 'Ingefær', 'Isbergsalat', 'Jordbær',
    'Kål', 'Lime', 'Løk', 'Mango', 'Melon', 'Paprika', 'Persille', 'Poteter',
    'Purre', 'Pærer', 'Rødløk', 'Salat', 'Sitron', 'Sopp', 'Spinat', 'Squash',
    'Sukkererter', 'Søtpotet', 'Tomater', 'Vårløk',
  ],
  brod: [
    'Baguett', 'Boller', 'Ciabatta', 'Grovbrød', 'Hamburgerbrød', 'Knekkebrød',
    'Lefse', 'Loff', 'Pitabrød', 'Pølsebrød', 'Rundstykker', 'Rugbrød',
    'Surdeigsbrød', 'Toastbrød', 'Tortillalefser',
  ],
  meieri: [
    'Crème fraîche', 'Egg', 'Havremelk', 'Helmelk', 'Kefir', 'Kesam', 'Kremfløte',
    'Kulturmelk', 'Lettmelk', 'Margarin', 'Matfløte', 'Rømme', 'Skyr', 'Smør',
    'Vaniljesaus', 'Yoghurt',
  ],
  palegg: [
    'Brunost', 'Gulost', 'Honning', 'Kaviar', 'Kremost', 'Leverpostei', 'Majones',
    'Makrell i tomat', 'Nugatti', 'Peanøttsmør', 'Prim', 'Salami', 'Servelat',
    'Skinke', 'Syltetøy',
  ],
  'kjott-fisk': [
    'Bacon', 'Fiskekaker', 'Grillpølser', 'Karbonadedeig', 'Kjøttdeig', 'Kjøttkaker',
    'Koteletter', 'Kylling', 'Kyllingfilet', 'Laks', 'Medisterdeig', 'Reker',
    'Røkelaks', 'Svinefilet', 'Torsk', 'Wienerpølser',
  ],
  middag: [
    'Ferdigpizza', 'Fiskegrateng', 'Lasagne', 'Pastasaus', 'Pizzabunn', 'Suppepose',
    'Tacokrydder', 'Tacolefser', 'Woksaus',
  ],
  torrvarer: [
    'Bakepulver', 'Couscous', 'Frokostblanding', 'Gjær', 'Havregryn', 'Hvetemel',
    'Kaffe', 'Kakao', 'Makaroni', 'Mandler', 'Müsli', 'Nudler', 'Olivenolje',
    'Pepper', 'Ris', 'Rosiner', 'Salt', 'Spaghetti', 'Sukker', 'Te', 'Vaniljesukker',
  ],
  hermetikk: [
    'Bearnaisesaus', 'Dressing', 'Eddik', 'Hakkede tomater', 'Hummus', 'Ketchup',
    'Kikerter', 'Kokosmelk', 'Oliven', 'Pesto', 'Rødkål', 'Salsa', 'Sennep',
    'Soyasaus', 'Sylteagurk', 'Tomatpuré', 'Tunfisk',
  ],
  frys: [
    'Fiskepinner', 'Frosne bær', 'Frosne erter', 'Iskrem', 'Lomper', 'Pommes frites',
  ],
  snacks: [
    'Kjeks', 'Kvikklunsj', 'Lakris', 'Nøtter', 'Ostepop', 'Popcorn', 'Potetgull',
    'Salte pinner', 'Sjokolade', 'Smågodt',
  ],
  drikke: [
    'Appelsinjuice', 'Brus', 'Cola', 'Eplejuice', 'Farris', 'Iste', 'Mineralvann',
    'Pils', 'Saft', 'Smoothie', 'Solo', 'Vin',
  ],
  husholdning: [
    'Aluminiumsfolie', 'Bakepapir', 'Batterier', 'Fyrstikker', 'Husholdningspapir',
    'Kluter', 'Lyspære', 'Oppvaskmiddel', 'Oppvasktabletter', 'Plastposer',
    'Servietter', 'Skyllemiddel', 'Stearinlys', 'Søppelposer', 'Toalettpapir',
    'Universalrens', 'Vaskemiddel',
  ],
  hygiene: [
    'Balsam', 'Bind', 'Bleier', 'Bodylotion', 'Deodorant', 'Dusjsåpe', 'Håndsåpe',
    'Paracet', 'Plaster', 'Q-tips', 'Sjampo', 'Solkrem', 'Tanntråd', 'Tannbørste',
    'Tannkrem', 'Tamponger', 'Våtservietter',
  ],
  dyr: ['Fuglefrø', 'Hundegodbiter', 'Hundemat', 'Kattemat', 'Kattesand'],
  annet: [],
};

export interface CommonItem {
  name: string;
  category: CategoryId;
}

/** Alle vanlige varer, flatet ut. */
export function commonItems(): CommonItem[] {
  const result: CommonItem[] = [];
  for (const [category, names] of Object.entries(COMMON_ITEMS)) {
    for (const name of names) {
      result.push({ name, category: category as CategoryId });
    }
  }
  return result;
}
