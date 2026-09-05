# Handleliste

En rolig, smart handleliste som sorterer varene etter kategori og lærer seg rytmen din:
hvor ofte du pleier å trenge melk, kaffe eller toalettpapir — og sier diskret fra når det
nærmer seg at du går tom.

Appen er en installerbar PWA. Alt ligger lagret på din egen enhet, den fungerer uten nett,
og ingen data sendes noe sted.

---

## Hovedgrep

**Hurtiginput som forstår norsk.** Skriv `2 l melk`, `kjøttdeig 400 g`, `3x yoghurt` eller
`kaffe, mørkbrent` — antall, enhet og notat blir tolket for deg. Autofullføring henter først
fra dine egne varer, deretter fra en innebygd ordliste på rundt 400 dagligvarer.

**Kategorier uten arbeid.** Nye varer plasseres automatisk i én av 15 kategorier. Flytter du
en vare, huskes det for alltid. Rekkefølgen på kategoriene kan du stille etter løypa i din
egen butikk, så følger lista deg gjennom lokalet.

**Forslag som lærer, ikke maser.** Se avsnittet under.

**Innsikt.** Hva du kjøper oftest, hvor ofte, og hva som står for tur.

**Widget-visning og snarveier.** En kompakt visning på `#/widget` for hjemskjermen, snarveier
i app-ikonet, og lenkeformatet `#/legg-til?vare=melk` som lar deg legge til varer fra en
iOS-snarvei, en Android-widget eller delingsmenyen i andre apper.

**Elegant og tilgjengelig.** Lyst og mørkt tema, store trykkflater, respekt for
`prefers-reduced-motion`, skjermleservennlige etiketter, angre på alt som fjernes.

---

## Slik virker forslagene

Motoren bor i [`src/lib/suggestions.ts`](src/lib/suggestions.ts) og bygger utelukkende på
tidspunktene du selv legger en vare i lista.

1. **Historikk samles.** Hver gang en vare legges til, lagres tidspunktet. Registreringer
   innenfor åtte timer regnes som samme handletur, så angring og ombestemming forurenser ikke
   læringen. Fjerner du en vare fra lista igjen, fjernes registreringen også.

2. **Terskel på to registreringer.** En vare må ha vært lagt til minst to ganger før appen sier
   noe som helst — først da finnes det et faktisk målt intervall. Dette er hardkodet som et
   minimum: innstillingen kan skrus opp, aldri under to.

3. **Intervallet beregnes.** Avstanden mellom hver registrering vektes eksponentielt, slik at
   de nyeste veier tyngst. Endrer vanene seg — fra ukentlig til annenhver dag — følger appen
   etter i løpet av et par sykluser.

4. **Sikkerhet vurderes.** Antall observasjoner og hvor jevn rytmen er, gir en sikkerhet fra 0
   til 1, vist som tre prikker. Ujevne varer havner nederst i rekkefølgen.

5. **Forslaget dukker opp litt før forfall.** Standard er ved 85 % av intervallet — kjøper du
   melk hver sjuende dag, kommer forslaget på dag seks. Marginen kan justeres i innstillingene.

6. **Appen tier når den bør.** Varer som allerede ligger i lista, er utsatt, har forslag
   avslått, eller er så langt på overtid at rytmen åpenbart er brutt, foreslås ikke. Forslag
   vises som en diskret stripe med chips — aldri som varsler eller popup-vinduer.

Trykk på klokkeikonet for «ikke nå», så tier varen en tredjedel av intervallet før den spør
igjen. Trykk «Slutt å foreslå» i detaljvisningen for å slå den av permanent, uten å miste
historikken.

---

## Kom i gang

```bash
npm install
npm run dev        # utviklingsserver
npm test           # 45 tester for parsing, kategorisering og forslagsmotoren
npm run build      # produksjonsbygg til dist/
npm run preview    # se på produksjonsbygget lokalt
```

Vil du se hvordan forslagene oppfører seg med en gang: **Innstillinger → Prøv eksempeldata**
legger inn en realistisk historikk med tolv varer.

### Publisering

`.github/workflows/deploy.yml` bygger og legger appen ut på GitHub Pages ved push til `main`
(slå på Pages med kilde «GitHub Actions» i innstillingene for repoet). En PWA må serveres over
HTTPS for å kunne installeres — Pages holder.

Hostes appen i en undermappe, sett basestien: `BASE_PATH=/Handleliste/ npm run build`.

### Installer på telefonen

- **iOS:** Åpne i Safari → Del → «Legg til på Hjem-skjerm».
- **Android:** Åpne i Chrome → menyen → «Installer app».

For en ekte hjemskjerm-widget: lag en snarvei til `#/widget` (kompakt visning), eller bruk
`#/legg-til?vare=melk` fra Snarveier på iOS for å legge til varer med ett trykk.

---

## Oppbygning

```
src/
  lib/
    types.ts          Datamodellen
    categories.ts     15 kategorier + norsk ordliste for autokategorisering
    parse.ts          Tolker «2 l melk» til struktur
    suggestions.ts    Intervall-læring og rangering av forslag
    storage.ts        Lagring i localStorage, med migrering av gamle data
    store.ts          Tilstand og handlinger, med angring
    demo.ts           Eksempeldata
  ui/
    ListView.tsx      Lista, gruppert etter kategori
    SuggestionsView.tsx
    InsightsView.tsx
    SettingsView.tsx
    WidgetView.tsx
    Composer.tsx      Hurtiginput med autofullføring
    EntrySheet.tsx    Detaljer for én vare
```

Ingen backend, ingen kontoer, ingen sporing. React og Vite er de eneste avhengighetene.

---

## Videre ideer

Ting som passer å bygge videre på, i den rekkefølgen de trolig gir mest:

- **Flere lister** (Hjem, Hytta, Fest) med hurtigbytte i toppen.
- **Deling mellom husstandsmedlemmer** — krever en liten synk-tjeneste, og bør være valgfritt
  slik at lokal bruk fortsatt er standard.
- **Oppskrifter** som legger inn alle ingrediensene med ett trykk.
- **Strekkodeskanning** for å legge til varer i butikken.
- **Sesongjustering** av forslagene (grillmat om sommeren, klementiner i desember).
- **Ekte OS-widgets**, som krever en tynn native innpakning rundt web-appen.
