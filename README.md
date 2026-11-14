# Varodd-prototype

Varodd-prototypen viser to tjenester for små bedrifter i Agder:

- **Oppdrag** (`specs/001-job-matching-marketplace`): en bedrift ber om kortvarig hjelp, får en
  kortliste over aktuelle arbeidstakere og velger selv hvem den vil jobbe med.
- **Kunnskapsbank** (`specs/002-shared-knowledge-base`): et forum der bedrifter i E-Waves stiller
  spørsmål og svarer hverandre, med søk, flagging som Varodd vurderer, og en simulert chatbot.

Begge tjenestene er bygget og ligger i samme app. All data er oppdiktet. Det finnes ingen server,
ingen ekte personer og ingen ekte KI-tjeneste.

## Kjøre prototypen

Den enkleste måten å prøve prototypen på er den offentlige versjonen på
https://varodd.jflottorp.no. Der trenger du ikke å installere noe.

For å kjøre den på din egen maskin trenger du [Node.js](https://nodejs.org/) 26 og
[pnpm](https://pnpm.io/). Kjør fra rotmappen:

```sh
pnpm install
pnpm dev
```

Åpne så http://localhost:5173 i nettleseren.

## Slik bruker du demoen

- Første gang du åpner nettsiden, vises en merknad om at den er en prototype og ikke er laget av
  Varodd. Den kan ikke lukkes før det har gått fem sekunder. For å se den igjen kan du slette
  nettstedets data i nettleseren eller åpne et privat vindu.
- Øverst kan du bytte mellom tjenestene og bytte hvilken simulert person du er. Det du ser og kan
  gjøre, avhenger av hvem du er.
- Forsiden viser en aktivitetsstrøm med det som har skjedd for personen du er nå.
- **Tilbakestill demo** setter alt tilbake til utgangspunktet. Dataene ligger bare i din egen
  nettleser.

Noen nyttige personer å bytte mellom:

| Person | Rolle |
|---|---|
| Kari Nordmann | Eier av Fjordlys Keramikk, medlem i E-Waves |
| Jonas Berg | Ansatt hos Fjordlys Keramikk |
| Per Hansen | Sørlandet Honning, medlem i E-Waves |
| Ola Dahl | Kvadraturen Kaffebrenneri, medlem i E-Waves |
| Silje Moen | Søker arbeid, og har fast jobb hos Kvadraturen Kaffebrenneri gjennom et oppdrag |
| Anne Lie | Lindesnes Ullvarer, ikke medlem i E-Waves, så hun får ikke bruke kunnskapsbanken |
| Marte Vik | Ansatt i Varodd, ser alt og vurderer flagget innhold |

## Hva du finner hvor

1. **`.specify/memory/constitution.md`**: grunnreglene alle tjenestene følger. Alt ligger i én
   delt kodebase, all data er fiktiv, prosjektet er testdrevet, og designet er hentet fra
   nettsiden til Varodd (https://varodd.no/).
2. **`specs/<tjeneste>/spec.md`**: hva tjenesten skal gjøre, i vanlige forretningstermer. Svarene
   fra avklaringsrundene med prosjekteier står i avsnittet «Clarifications».
3. **`specs/<tjeneste>/plan.md`**, `research.md`, `data-model.md` og `contracts/`: hvordan den er
   bygget, og hvorfor.
4. **`specs/<tjeneste>/tasks.md`**: oppgavelisten tjenesten ble bygget etter.
5. **`specs/<tjeneste>/quickstart.md`**: scenarioene som viser at tjenesten virker.
6. **`src/`**: koden. `src/frame/` er rammen som er felles for alle tjenestene (toppmeny,
   forside, brukerbytte, design), `src/domain/` er reglene, og `src/features/` er sidene for hver
   tjeneste.

Mappene `.specify/` og `.claude/` inneholder verktøyene en AI-kodeassistent brukte til å skrive
spesifikasjonene og koden. Du kan se bort fra dem med mindre du selv bruker det verktøyet.

## Tester

```sh
pnpm test                                  # regler, demodata og komponenter
pnpm exec playwright test --workers=2      # hele brukerreiser i nettleser, på PC- og mobilstørrelse
pnpm lint
pnpm typecheck
```

Før Playwright kjøres første gang, må nettleserne installeres med
`pnpm exec playwright install chromium webkit`.

## Status nå

Begge tjenestene er bygget, og alle automatiske tester består. Det inkluderer
tilgjengelighetssjekker etter WCAG 2.1 AA på alle sider, på både PC- og mobilstørrelse.

Dette står igjen:

- Den manuelle tilgjengelighetstesten av kunnskapsbanken (oppgave T079): kun tastatur,
  skjermleser og en tidtatt test med en person som ikke har brukt prototypen før.

Noen spørsmål er bevisst latt stå åpne, fordi de ikke påvirker det prototypen skal vise:

- Hvem som skal være arbeidsgiver for arbeidstakerne.
- Hvem som vedlikeholder listen over ferdigheter og listen over emner i forumet. Inntil videre er
  begge faste i demodataene.
- Om forfattere skal kunne slette egne spørsmål og svar.

## Gi tilbakemelding

Legg kommentarer på pull requesten, på de konkrete linjene eller avsnittene du har spørsmål til.
