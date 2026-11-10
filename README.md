# Varodd-prototype

Dette repoet er designstadiet for Varodd, en prototype som matcher små Agder-bedrifter med
personer som søker kortvarig arbeid, og som lar disse bedriftene dele kunnskap med hverandre.
Det finnes ingen applikasjonskode ennå — det som ligger her er spesifikasjonen: hva systemet skal
gjøre, skrevet ned før noe bygges.

## Du trenger ikke Python eller spesielle verktøy for å lese dette

Alt du behøver å lese er vanlige Markdown-filer (`.md`). Åpne dem i en hvilken som helst
teksteditor, eller les dem direkte på GitHub i nettleseren — ingen oppsett nødvendig. Mappene
`.specify/` og `.claude/` inneholder automatisering som en AI-kodeassistent bruker til å generere
og oppdatere disse dokumentene; du kan se bort fra dem med mindre du selv kjører dette verktøyet.

## Hva du bør lese, i denne rekkefølgen

1. **`.specify/memory/constitution.md`** — grunnreglene alle funksjoner må følge. Per nå: alt må
   ligge i én delt kodebase, all ekstern data (NAV, skannede bedriftsnettsider, kunder) må være
   fiktiv/simulert siden dette er en prototype, prosjektet er testdrevet, og alle funksjoner bruker
   det samme visuelle uttrykket som nettsiden til Varodd (https://varodd.no/).
2. **`specs/001-job-matching-marketplace/spec.md`** — funksjonen for å matche bedriftseiere med
   arbeidssøkere (en bedrift ber om kortvarig hjelp, får en kortliste over aktuelle arbeidstakere
   og velger selv hvem den vil jobbe med). Siden denne bygges først, beskriver den også rammen som
   er felles for hele prototypen: én felles forside med aktivitetsstrøm, knapper i toppen for å
   bytte mellom funksjonene, bytte mellom simulerte brukere, tilbakestilling av demodata,
   feilsøkingsknapper for å simulere at tid går, og designet (farger, skrifttyper, knapper og
   tone) hentet fra nettsiden til Varodd. Filen `checklists/requirements.md` like ved
   siden er en godkjent/ikke-godkjent kvalitetskontroll av selve spesifikasjonen.
3. **`specs/002-shared-knowledge-base/spec.md`** — det delte spørsmål-og-svar-forumet der
   medlemmer av E-Waves kan hjelpe hverandre, med en simulert chatbot på toppen. Den bruker den
   felles rammen og de samme bedriftene som 001. Samme sjekkliste-mønster.

Hver spesifikasjon forklarer funksjonen i vanlige forretningstermer (hvem gjør hva, og hvorfor),
lister opp konkret hva systemet må gjøre, og beskriver hvilke antakelser som er gjort der den
opprinnelige beskrivelsen ikke var tydelig.

## Status nå

Begge spesifikasjonene er utkast som er gjennomgått og oppdatert sammen med prosjekteier, og begge
består sine kvalitetssjekklister. Svarene fra avklaringsrunden står i avsnittet «Clarifications»
øverst i hver spesifikasjon.

Noen spørsmål er bevisst latt stå åpne til senere, fordi de ikke påvirker det prototypen skal vise:

- Hvem som skal være arbeidsgiver for arbeidstakerne.
- Hvem som vedlikeholder listen over ferdigheter og listen over emner i forumet. Inntil videre er
  begge faste i demodataene.
- Om forfattere skal kunne slette egne spørsmål og svar. Ingenting er ennå tatt
videre til implementeringsplanlegging — det finnes ingen arkitektur, oppgaveliste eller kode. Det
er neste skritt, og det skjer gjennom den samme AI-assisterte prosessen som produserte disse
spesifikasjonene.

## Gi tilbakemelding

Legg kommentarer på pull requesten på de konkrete linjene eller avsnittene du har spørsmål til
eller er usikker på, på samme måte som du ville gjennomgått en annen dokumentendring.
