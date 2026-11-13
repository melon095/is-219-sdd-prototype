import { createApplyCommand } from "../../src/domain/frame/commands";
import type {
  ActivityEntry,
  Command,
  DemoState,
  Id,
} from "../../src/domain/frame/types";
import { knowledgeBaseCommandHandlers } from "../../src/domain/knowledge-base/commands";
import {
  emptyKnowledgeBaseState,
  type KnowledgeBaseState,
  type Topic,
} from "../../src/domain/knowledge-base/types";
import type { FrameSeed } from "./frame";
import type { Rng } from "./random";

const anchorDate = "2026-11-16";

const applyCommand = createApplyCommand({
  handlers: knowledgeBaseCommandHandlers,
  systemSteps: [],
});

const topics: Topic[] = [
  {
    id: "tema-1",
    name: "Nettbutikk",
    description: "Oppsett, produktsider, frakt og betaling i nettbutikken din.",
  },
  {
    id: "tema-2",
    name: "Teknisk hjelp",
    description:
      "Når noe ikke virker, eller du trenger hjelp med det tekniske.",
  },
  {
    id: "tema-3",
    name: "Kunstig intelligens",
    description:
      "Hvordan du kan bruke KI-verktøy som Claude i hverdagen i bedriften.",
  },
  {
    id: "tema-4",
    name: "Markedsføring",
    description:
      "Sosiale medier, nyhetsbrev, bilder og andre måter å nå kundene på.",
  },
  {
    id: "tema-5",
    name: "Drift og regnskap",
    description: "Regnskap, avgifter, lager og alt som holder driften i gang.",
  },
];

type QuestionSpec = {
  key: string;
  authorId: Id;
  at: string;
  topicId: Id;
  title: string;
  description: string;
};

type AnswerSpec = {
  questionKey: string;
  authorId: Id;
  at: string;
  text: string;
};

const kari = "person-1";
const jonas = "person-2";
const per = "person-3";
const ola = "person-5";

const questionSpecs: QuestionSpec[] = [
  {
    key: "frakt",
    authorId: jonas,
    at: "2026-10-19T09:15:00+02:00",
    topicId: "tema-1",
    title: "Hvordan setter vi opp frakt til hele landet i nettbutikken?",
    description:
      "Vi selger keramikk som kan gå i stykker, og vi har bare brukt Posten til nå. Vi vil tilby frakt til hele landet uten at pakkene blir for dyre. Hva har dere gjort?",
  },
  {
    key: "betaling",
    authorId: per,
    at: "2026-10-21T10:00:00+02:00",
    topicId: "tema-1",
    title: "Hvilke betalingsmåter bør nettbutikken tilby?",
    description:
      "Vi har bare kortbetaling i dag, og noen kunder spør etter Vipps og faktura. Er det verdt å tilby flere betalingsmåter, og hva koster det?",
  },
  {
    key: "abonnement",
    authorId: ola,
    at: "2026-10-27T09:30:00+01:00",
    topicId: "tema-1",
    title: "Hvordan lager jeg et kaffeabonnement i nettbutikken?",
    description:
      "Vi vil la kundene bestille kaffe som sendes hver måned. Jeg finner ikke en enkel måte å sette det opp på i Shopify. Er det noen som har gjort det?",
  },
  {
    key: "tregmobil",
    authorId: kari,
    at: "2026-10-22T11:00:00+02:00",
    topicId: "tema-2",
    title: "Nettbutikken er treg på mobil, hva kan vi gjøre?",
    description:
      "Siden bruker lang tid på å laste når kundene sitter på mobil. Vi har mange store bilder av keramikken. Hvor bør vi starte?",
  },
  {
    key: "epost",
    authorId: jonas,
    at: "2026-10-28T13:45:00+01:00",
    topicId: "tema-2",
    title:
      "Hva gjør vi hvis kunder ikke får bestillingsbekreftelsen på e-post?",
    description:
      "Noen kunder sier at de ikke får e-post etter at de har bestilt. Vi vet ikke om den ligger i søppelpost, eller om noe er feil med oppsettet vårt.",
  },
  {
    key: "sikkerhetskopi",
    authorId: per,
    at: "2026-11-03T08:50:00+01:00",
    topicId: "tema-2",
    title: "Hvordan tar jeg sikkerhetskopi av produktene og kundene?",
    description:
      "Jeg er redd for å miste alt hvis noe går galt med nettbutikken. Hvordan kan jeg ta en kopi av produktlisten og kundelisten?",
  },
  {
    key: "produkttekster",
    authorId: kari,
    at: "2026-10-23T10:20:00+02:00",
    topicId: "tema-3",
    title: "Hvordan kan jeg bruke Claude til å skrive produkttekster?",
    description:
      "Vi har over 80 produkter i nettbutikken, og tekstene er skrevet i ulik stil. Kan Claude hjelpe oss å lage bedre tekster uten at det høres ut som en robot?",
  },
  {
    key: "kundeepost",
    authorId: ola,
    at: "2026-10-26T14:30:00+01:00",
    topicId: "tema-3",
    title: "Kan Claude hjelpe meg å svare på e-poster fra kunder?",
    description:
      "Hver mandag bruker jeg en time på å svare kunder om leveringstid og abonnement. Kan jeg bruke Claude til å skrive svarene, og er det trygt å lime inn e-poster fra kunder?",
  },
  {
    key: "kiihverdagen",
    authorId: per,
    at: "2026-11-05T09:40:00+01:00",
    topicId: "tema-3",
    title: "Hvordan lærer jeg meg å bruke KI i hverdagen?",
    description:
      "Jeg har bare prøvd Claude noen få ganger og vet ikke helt hva jeg skal bruke det til i en liten bedrift. Hva bør jeg starte med?",
  },
  {
    key: "instagram",
    authorId: jonas,
    at: "2026-10-24T11:15:00+02:00",
    topicId: "tema-4",
    title: "Hvor ofte bør vi legge ut på Instagram?",
    description:
      "Vi er to som jobber i butikken, og det er vanskelig å finne tid til sosiale medier. Hvor ofte må vi legge ut for at det skal ha noen effekt?",
  },
  {
    key: "nyhetsbrev",
    authorId: kari,
    at: "2026-10-29T09:00:00+01:00",
    topicId: "tema-4",
    title: "Hvordan setter vi opp et nyhetsbrev som folk faktisk leser?",
    description:
      "Vi har rundt 300 e-postadresser fra kunder som har meldt seg på i nettbutikken. Hva bør vi skrive om, og hvor ofte bør vi sende?",
  },
  {
    key: "bilder",
    authorId: ola,
    at: "2026-11-06T10:30:00+01:00",
    topicId: "tema-4",
    title: "Hvordan får vi bedre produktbilder uten å leie inn fotograf?",
    description:
      "Vi tar bildene av kaffeposene selv med telefonen, men de ser litt kjedelige ut. Har dere tips til lys og bakgrunn?",
  },
  {
    key: "regnskap",
    authorId: per,
    at: "2026-10-30T10:10:00+01:00",
    topicId: "tema-5",
    title: "Hvordan holder jeg orden på regnskapet som enkeltpersonforetak?",
    description:
      "Jeg fører regnskapet selv og har ikke full oversikt. Hva bør jeg gjøre hver måned for å slippe stress ved årsslutt?",
  },
  {
    key: "moms",
    authorId: kari,
    at: "2026-11-02T11:20:00+01:00",
    topicId: "tema-5",
    title: "Hvordan håndterer vi merverdiavgift ved salg til utlandet?",
    description:
      "Vi har fått de første kundene i Sverige og Danmark. Må vi ta med moms på bestillingene, og hva må vi melde inn?",
  },
  {
    key: "lagertelling",
    authorId: ola,
    at: "2026-11-09T09:30:00+01:00",
    topicId: "tema-5",
    title: "Hvordan teller vi opp lageret uten å bruke hele dagen?",
    description:
      "Vi teller kaffe og utstyr for hånd hver måned, og det tar altfor lang tid. Finnes det en enklere måte?",
  },
  {
    key: "usolgt",
    authorId: jonas,
    at: "2026-11-10T10:45:00+01:00",
    topicId: "tema-5",
    title: "Hva gjør vi med varer som ikke selger?",
    description:
      "Vi har keramikk som har stått på lager i over et år. Skal vi sette ned prisen, pakke det i bokser eller gi det bort?",
  },
];

const answerSpecs: AnswerSpec[] = [
  {
    questionKey: "frakt",
    authorId: per,
    at: "2026-10-19T14:30:00+02:00",
    text: "Hos oss fungerer faste fraktpriser etter vekt best. Vi tilbyr gratis frakt over 600 kroner, og det gjorde at kundene la flere varer i handlekurven. Pakk glass og keramikk i bobleplast og en solid eske, så slipper du reklamasjoner.",
  },
  {
    questionKey: "frakt",
    authorId: kari,
    at: "2026-10-20T08:40:00+02:00",
    text: "Vi har satt opp tre fraktalternativer: hentested, pakke i postkassen og hjemlevering. Husk å legge inn riktig vekt på hvert produkt, ellers blir fraktprisen feil i kassen.",
  },
  {
    questionKey: "betaling",
    authorId: ola,
    at: "2026-10-21T15:20:00+02:00",
    text: "Vi la til Vipps i fjor, og nå går omtrent halvparten av salget den veien. Det koster litt mer per ordre, men færre avbryter kjøpet i kassen. Faktura har vi ikke tatt inn, fordi det gir mer jobb med purringer.",
  },
  {
    questionKey: "tregmobil",
    authorId: per,
    at: "2026-10-22T16:10:00+02:00",
    text: "Det er nesten alltid bildene. Last opp mindre filer, for eksempel under 300 kilobyte, og bruk formatet WebP hvis temaet ditt støtter det. Test siden på PageSpeed Insights etterpå, så ser du om det hjalp.",
  },
  {
    questionKey: "tregmobil",
    authorId: ola,
    at: "2026-10-23T09:05:00+02:00",
    text: "Sjekk også hvor mange apper du har installert. Vi fjernet tre som vi ikke brukte, og siden ble merkbart raskere.",
  },
  {
    questionKey: "produkttekster",
    authorId: per,
    at: "2026-10-23T15:45:00+02:00",
    text: "Jeg limer inn noen av tekstene mine som eksempel og ber Claude skrive i samme stil. Så gir jeg fakta om produktet: størrelse, materiale og hva det passer til. Les alltid gjennom, for Claude kan finne på detaljer som ikke stemmer.",
  },
  {
    questionKey: "produkttekster",
    authorId: ola,
    at: "2026-10-24T09:10:00+02:00",
    text: "Det hjelper å fortelle hvem som skal lese teksten. Jeg skriver for eksempel at kunden er en kaffeinteressert 40-åring som vil vite hvordan kaffen smaker. Be om tre forslag, og velg det du liker best.",
  },
  {
    questionKey: "instagram",
    authorId: per,
    at: "2026-10-24T14:00:00+02:00",
    text: "Vi legger ut to ganger i uken og ellers ikke, og det fungerer fint. Det viktigste er at det er jevnt. Planlegg noen innlegg på søndag, så slipper du å tenke på det resten av uken.",
  },
  {
    questionKey: "produkttekster",
    authorId: jonas,
    at: "2026-10-26T12:00:00+01:00",
    text: "Vi har laget en fast mal som vi limer inn hver gang, med tone, lengde og hva teksten skal inneholde. Da blir alle produkttekstene like, og vi sparer mye tid.",
  },
  {
    questionKey: "kundeepost",
    authorId: kari,
    at: "2026-10-27T09:00:00+01:00",
    text: "Det går fint til å lage utkast, men du bør ikke lime inn navn, adresser eller bestillingsnummer. Fjern persondata først. Så leser du gjennom svaret og sender det selv.",
  },
  {
    questionKey: "epost",
    authorId: ola,
    at: "2026-10-28T17:00:00+01:00",
    text: "Sjekk at du sender fra en egen avsenderadresse på domenet ditt, og at SPF og DKIM er satt opp hos den som har domenet. Uten det havner mye i søppelpost. Be gjerne kundene sjekke søppelpostmappen første gang.",
  },
  {
    questionKey: "nyhetsbrev",
    authorId: ola,
    at: "2026-10-29T13:25:00+01:00",
    text: "Send én gang i måneden, og skriv om det som skjer bak kulissene: nye produkter, hva som er på lager og en liten historie. Vi bruker Mailchimp, og gratisplanen holder lenge.",
  },
  {
    questionKey: "regnskap",
    authorId: kari,
    at: "2026-10-30T14:40:00+01:00",
    text: "Sett av en time hver fredag til bilag. Ta bilde av kvitteringene med en gang og legg dem i regnskapsprogrammet. Da er det aldri mer enn en uke å ta igjen.",
  },
  {
    questionKey: "kiihverdagen",
    authorId: kari,
    at: "2026-11-05T14:20:00+01:00",
    text: "Velg én oppgave du gjør ofte og synes er kjedelig, for eksempel å skrive varebeskrivelser eller svare på de samme spørsmålene fra kunder. Prøv Claude på akkurat den oppgaven i to uker før du prøver noe nytt.",
  },
  {
    questionKey: "bilder",
    authorId: kari,
    at: "2026-11-06T15:50:00+01:00",
    text: "Sett produktet ved et stort vindu og bruk et hvitt ark som reflekterer lyset. Unngå blitsen. Vi bruker en grå bakgrunn av papp, og den gjør at keramikken skiller seg godt ut.",
  },
  {
    questionKey: "lagertelling",
    authorId: jonas,
    at: "2026-11-09T13:15:00+01:00",
    text: "Vi teller bare de ti mest solgte varene hver uke, og resten én gang i kvartalet. Det tar en halvtime i stedet for en hel dag. Bruk et enkelt regneark med kolonner for beholdning og plukkliste.",
  },
];

type Step = { at: string; order: number; exec: () => void };

function mapped(map: Map<Id, Id>, id: Id): Id {
  const value = map.get(id);
  if (value === undefined) {
    throw new Error(`Mangler ny ID for ${id}`);
  }
  return value;
}

function assignIds(
  items: { id: Id }[],
  prefix: string,
  map: Map<Id, Id>,
): void {
  items.forEach((item, index) => {
    map.set(item.id, `${prefix}-${index + 1}`);
  });
}

function createHistory(frame: FrameSeed) {
  let state: DemoState = {
    meta: {
      seedId: "",
      anchorDate,
      loadedAt: `${anchorDate}T08:00:00+01:00`,
    },
    frame: {
      people: frame.people,
      businesses: frame.businesses,
      skills: frame.skills,
      activity: [],
    },
    marketplace: {
      workerProfiles: [],
      requests: [],
      conversations: [],
      crawlCatalog: [],
      crawlRuns: [],
    },
    knowledgeBase: { ...emptyKnowledgeBaseState(), topics },
  };
  let counter = 0;
  const newId = () => {
    counter += 1;
    return `midlertidig-${counter}`;
  };
  const questionIds = new Map<string, Id>();
  const steps: Step[] = [];

  function schedule(at: string, exec: () => void): void {
    steps.push({ at, order: steps.length, exec });
  }

  function execute(actorId: Id, at: string, command: Command): void {
    const result = applyCommand(state, command, { actorId, now: at, newId });
    if (!result.ok) {
      throw new Error(
        `Seed-kommandoen ${command.type} feilet: ${result.error.message}`,
      );
    }
    state = result.state;
  }

  function questionIdOf(key: string): Id {
    const id = questionIds.get(key);
    if (id === undefined) {
      throw new Error(`Seed-spørsmålet ${key} er ikke stilt ennå`);
    }
    return id;
  }

  function ask(spec: QuestionSpec): void {
    schedule(spec.at, () => {
      execute(spec.authorId, spec.at, {
        type: "postQuestion",
        topicId: spec.topicId,
        title: spec.title,
        description: spec.description,
      });
      const created = state.knowledgeBase.questions.at(-1);
      if (created === undefined) {
        throw new Error("Seed-spørsmålet ble ikke opprettet");
      }
      questionIds.set(spec.key, created.id);
    });
  }

  function reply(spec: AnswerSpec): void {
    schedule(spec.at, () =>
      execute(spec.authorId, spec.at, {
        type: "postAnswer",
        questionId: questionIdOf(spec.questionKey),
        text: spec.text,
      }),
    );
  }

  function play(): void {
    [...steps]
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.order - b.order)
      .forEach((step) => {
        step.exec();
      });
  }

  return { current: () => state, ask, reply, play };
}

function renumber(state: DemoState): {
  knowledgeBase: KnowledgeBaseState;
  activity: ActivityEntry[];
} {
  const questionIds = new Map<Id, Id>();
  const answerIds = new Map<Id, Id>();
  const activityIds = new Map<Id, Id>();
  const { questions, answers } = state.knowledgeBase;
  assignIds(questions, "sporsmal", questionIds);
  assignIds(answers, "svar", answerIds);
  assignIds(state.frame.activity, "aktivitet-kb", activityIds);
  const routePrefix = "/kunnskapsbank/sporsmal/";
  return {
    knowledgeBase: {
      ...state.knowledgeBase,
      questions: questions.map((item) => ({
        ...item,
        id: mapped(questionIds, item.id),
      })),
      answers: answers.map((item) => ({
        ...item,
        id: mapped(answerIds, item.id),
        questionId: mapped(questionIds, item.questionId),
      })),
    },
    activity: state.frame.activity.map((entry) => ({
      ...entry,
      id: mapped(activityIds, entry.id),
      target: {
        route: `${routePrefix}${mapped(questionIds, entry.target.route.replace(routePrefix, ""))}`,
      },
    })),
  };
}

export function seedKnowledgeBase(
  _rng: Rng,
  frame: FrameSeed,
): {
  key: "knowledgeBase";
  data: KnowledgeBaseState;
  activity: ActivityEntry[];
} {
  const history = createHistory(frame);
  questionSpecs.forEach(history.ask);
  answerSpecs.forEach(history.reply);
  history.play();
  const result = renumber(history.current());
  return {
    key: "knowledgeBase",
    data: result.knowledgeBase,
    activity: result.activity,
  };
}
