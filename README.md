# Handleliste

En rolig, smart handleliste som sorterer varene etter kategori og lærer seg rytmen din:
hvor ofte du pleier å trenge melk, kaffe eller toalettpapir — og sier diskret fra når det
nærmer seg at du går tom.

Appen installeres som en **Android-app (APK)** — ingen hosting, ingen konto, ingen app-butikk.
Alt ligger lagret på din egen telefon, den fungerer uten nett, og ingen data sendes noe sted.
Den samme koden kjører også som PWA i nettleseren.

## Last ned og installer

**[Siste APK](https://github.com/gizmo6663-dev/Handleliste/releases/tag/siste)** — åpne lenken
på telefonen, last ned filen og trykk på den.

Første gang spør Android om lov til å installere apper fra nettleseren din; det er den
vanlige advarselen for apper som ikke kommer fra Play-butikken. Alle bygg signeres med samme
nøkkel, så en ny versjon kan installeres rett oppå den forrige — handlelista og alt appen har
lært blir liggende.

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

**To hjemskjerm-widgeter du kan handle i.** *Handleliste* viser lista og lar deg krysse av varer
med ett trykk, uten å åpne appen. *Snart tomt* viser varene du trolig snart trenger påfyll av,
med hvor ofte du pleier å kjøpe dem — ett trykk legger varen på lista. Begge ruller, så de viser
alt uansett hvor store du gjør dem. I nettleseren finnes en kompakt visning på `#/widget`, og
lenkeformatet `#/legg-til?vare=melk` lar deg legge til varer fra delingsmenyen i andre apper.

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
npm test           # 55 tester for parsing, kategorisering, forslag og widgetene
npm run build      # produksjonsbygg til dist/
npm run preview    # se på produksjonsbygget lokalt
```

Vil du se hvordan forslagene oppfører seg med en gang: **Innstillinger → Prøv eksempeldata**
legger inn en realistisk historikk med tolv varer.

### Nettversjonen

Android-APK-en er hovedveien, men den samme koden kjører som PWA i nettleseren.
`.github/workflows/deploy.yml` legger den på GitHub Pages — den kjører bare når du selv starter
den, fra Actions-fanen. Hostes appen i en undermappe, sett basestien:
`BASE_PATH=/Handleliste/ npm run build`.

På iPhone finnes ingen APK; der installeres nettversjonen fra Safari via Del →
«Legg til på Hjem-skjerm».

---

## Android-appen

Web-appen pakkes med [Capacitor](https://capacitorjs.com) og kjøres i en WebView. Alle filene
ligger i APK-en, så appen starter uten nett og trenger ingen server. Den eneste tillatelsen
appen ber om er INTERNET, som Capacitor bruker for sin egen lokale bro.

**Byggingen skjer i GitHub Actions** (`.github/workflows/android.yml`), som har Android SDK
tilgjengelig. Hver kjøring tester, bygger, signerer og legger APK-en ut som utgivelsen «siste».
Versjonskoden telles opp per kjøring, siden Android nekter å installere en APK med samme eller
lavere versionCode over en eksisterende.

Vil du bygge lokalt trenger du JDK 21 og Android SDK:

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleRelease
# APK-en havner i android/app/build/outputs/apk/release/
```

### Om signeringsnøkkelen

`android/handleliste.keystore` ligger i repoet med vilje. Appen sideloades og publiseres ikke i
noen butikk, og uten samme signatur i hvert bygg måtte appen avinstalleres før hver oppdatering
— noe som ville slettet handlelista og hele læringshistorikken.

Skal appen en dag distribueres videre, bytt til en nøkkel du holder hemmelig: legg den i
GitHub Secrets og sett `HANDLELISTE_KEYSTORE`, `HANDLELISTE_KEYSTORE_PASSWORD`,
`HANDLELISTE_KEY_ALIAS` og `HANDLELISTE_KEY_PASSWORD` i workflowen. Byggefila leser dem
allerede fra miljøet.

### Widgetene

En widget kan verken lese eller skrive WebViewens localStorage, så broen går begge veier gjennom
`SharedPreferences` (`WidgetStore`):

**Ut til widgetene.** Appen sender en oppsummering av lista og forslagene hver gang noe endrer
seg. Widgetene tegner seg fra den, gjennom en tjeneste per widget (`ListWidgetService`,
`PafyllWidgetService`) — det er det som gjør at listene kan rulle og widgeten endre størrelse.

**Inn fra widgetene.** Et trykk kan ikke skrive til appens lagring, så det legges i en kø
(`WidgetActions`) mens widgeten oppdaterer sin egen visning med det samme — du ser altså
resultatet uten å vente. Neste gang appen er framme, ved oppstart eller når den kommer i
forgrunnen, tømmer den køen og kjører handlingene gjennom sin egen logikk. Køen leses og tømmes
i samme operasjon, så et trykk kan ikke utføres to ganger. Tidspunktet som registreres er da
**trykket skjedde**, ikke da appen rakk å lese køen — det er dette forslagsmotoren lærer av.

Påfyll-widgeten får med seg forfallstidspunktet for hvert forslag, ikke bare de som er aktuelle
akkurat nå, og filtrerer selv på tid. Dermed viser den riktige varer også når appen ikke har
vært åpen på en stund.

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
    widget.ts         Mater hjemskjerm-widgeten på Android
  ui/
    ListView.tsx      Lista, gruppert etter kategori
    SuggestionsView.tsx
    InsightsView.tsx
    SettingsView.tsx
    WidgetView.tsx
    Composer.tsx      Hurtiginput med autofullføring
    EntrySheet.tsx    Detaljer for én vare

android/
  app/src/main/java/no/handleliste/app/
    MainActivity.java       WebView + window insets
    HandlelistePlugin.java  Broen mellom websiden og widgetene
    WidgetStore.java        Delt lagring: snapshot ut, kø av trykk inn
    WidgetActions.java      Det som skjer når noen trykker i en widget
    WidgetListFactory.java  Radene i begge widgetene
    HandlelisteWidget.java  Handlelista, med avkryssing
    PafyllWidget.java       «Snart tomt», med ett trykk for å legge til
```

Ingen backend, ingen kontoer, ingen sporing. React, Vite og Capacitor er de eneste
avhengighetene.

---

## Videre ideer

Ting som passer å bygge videre på, i den rekkefølgen de trolig gir mest:

- **Flere lister** (Hjem, Hytta, Fest) med hurtigbytte i toppen.
- **Deling mellom husstandsmedlemmer** — krever en liten synk-tjeneste, og bør være valgfritt
  slik at lokal bruk fortsatt er standard.
- **Oppskrifter** som legger inn alle ingrediensene med ett trykk.
- **Strekkodeskanning** for å legge til varer i butikken.
- **Sesongjustering** av forslagene (grillmat om sommeren, klementiner i desember).
- **Skrive inn varer i widgeten** — krever en liten egen dialog, siden en widget ikke kan ta
  imot tekst selv.
- **iOS-app**, som krever en Mac og en utviklerkonto for å signere.
