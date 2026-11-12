import { createApplyCommand } from "../../src/domain/frame/commands";
import type {
  ActivityEntry,
  Command,
  DemoState,
  Id,
} from "../../src/domain/frame/types";
import { marketplaceCommandHandlers } from "../../src/domain/marketplace/commands";
import type {
  ExperienceLevel,
  MarketplaceState,
  PublishRequestInput,
  WorkerProfile,
} from "../../src/domain/marketplace/types";
import type { FrameSeed } from "./frame";
import type { Rng } from "./random";

const anchorDate = "2026-11-16";

const applyCommand = createApplyCommand({
  handlers: marketplaceCommandHandlers,
  systemSteps: [],
});

type RequestFields = Omit<PublishRequestInput, "businessId">;

function profile(
  personId: Id,
  skillIds: Id[],
  experienceLevel: ExperienceLevel,
  availableFrom: string,
  eligibleSince: string,
  wishes?: string,
  navReferredAt?: string,
): WorkerProfile {
  const result: WorkerProfile = {
    personId,
    skillIds,
    experienceLevel,
    availableFrom,
    isDraft: false,
    eligibleSince,
  };
  if (wishes !== undefined) {
    result.wishes = wishes;
  }
  if (navReferredAt !== undefined) {
    result.navReferral = { referredAt: navReferredAt, simulated: true };
  }
  return result;
}

const workerProfiles: WorkerProfile[] = [
  profile(
    "person-8",
    [
      "ferdighet-2",
      "ferdighet-3",
      "ferdighet-6",
      "ferdighet-7",
      "ferdighet-12",
      "ferdighet-16",
      "ferdighet-18",
    ],
    "mid",
    "2026-11-23",
    "2026-10-12T10:00:00+02:00",
    "Jeg vil gjerne hjelpe små nettbutikker med å bli mer synlige på nett.",
  ),
  profile(
    "person-9",
    [
      "ferdighet-1",
      "ferdighet-5",
      "ferdighet-6",
      "ferdighet-11",
      "ferdighet-13",
    ],
    "senior",
    "2026-11-30",
    "2026-10-05T10:00:00+02:00",
    "Jeg liker å lage bilder og innhold som får produkter til å se best mulig ut.",
  ),
  profile(
    "person-10",
    [
      "ferdighet-2",
      "ferdighet-4",
      "ferdighet-8",
      "ferdighet-15",
      "ferdighet-17",
    ],
    "senior",
    "2026-11-16",
    "2026-10-19T09:00:00+02:00",
  ),
  profile(
    "person-11",
    [
      "ferdighet-5",
      "ferdighet-6",
      "ferdighet-7",
      "ferdighet-10",
      "ferdighet-12",
      "ferdighet-13",
    ],
    "junior",
    "2026-12-07",
    "2026-10-26T12:00:00+01:00",
    "Jeg er ny i bransjen, men lærer raskt og er glad i design.",
    "2026-10-20T09:00:00+02:00",
  ),
  profile(
    "person-12",
    [
      "ferdighet-2",
      "ferdighet-8",
      "ferdighet-9",
      "ferdighet-15",
      "ferdighet-17",
    ],
    "junior",
    "2026-11-18",
    "2026-10-14T09:00:00+02:00",
    "Jeg har erfaring fra lager og vil gjerne jobbe praktisk.",
    "2026-10-08T09:00:00+02:00",
  ),
];

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
      workerProfiles,
      requests: [],
      conversations: [],
      crawlCatalog: [],
      crawlRuns: [],
    },
  };
  let counter = 0;
  const newId = () => {
    counter += 1;
    return `midlertidig-${counter}`;
  };

  function run(actorId: Id, at: string, command: Command): void {
    const result = applyCommand(state, command, { actorId, now: at, newId });
    if (!result.ok) {
      throw new Error(
        `Seed-kommandoen ${command.type} feilet: ${result.error.message}`,
      );
    }
    state = result.state;
  }

  function publish(
    actorId: Id,
    at: string,
    businessId: Id,
    fields: RequestFields,
  ): Id {
    run(actorId, at, { type: "publishRequest", businessId, ...fields });
    const created = state.marketplace.requests.at(-1);
    if (created === undefined) {
      throw new Error("Seed-oppdraget ble ikke opprettet");
    }
    return created.id;
  }

  function message(
    requestId: Id,
    workerId: Id,
    authorId: Id,
    at: string,
    text: string,
  ): void {
    const conversation = state.marketplace.conversations.find(
      (item) => item.requestId === requestId && item.workerId === workerId,
    );
    if (conversation === undefined) {
      throw new Error("Seed-samtalen finnes ikke");
    }
    run(authorId, at, {
      type: "sendMessage",
      conversationId: conversation.id,
      text,
    });
  }

  return {
    current: () => state,
    run,
    publish,
    message,
  };
}

function mapped(map: Map<Id, Id>, id: Id): Id {
  const value = map.get(id);
  if (value === undefined) {
    throw new Error(`Mangler ny ID for ${id}`);
  }
  return value;
}

function byTime<T extends { at: string }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        Date.parse(a.item.at) - Date.parse(b.item.at) || a.index - b.index,
    )
    .map(({ item }) => item);
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

function renumber(state: DemoState): {
  marketplace: MarketplaceState;
  activity: ActivityEntry[];
} {
  const requestIds = new Map<Id, Id>();
  const conversationIds = new Map<Id, Id>();
  const messageIds = new Map<Id, Id>();
  const logIds = new Map<Id, Id>();
  const activityIds = new Map<Id, Id>();
  const { requests, conversations } = state.marketplace;
  assignIds(requests, "oppdrag", requestIds);
  assignIds(conversations, "samtale", conversationIds);
  assignIds(
    byTime(conversations.flatMap((item) => item.messages)),
    "melding",
    messageIds,
  );
  assignIds(byTime(requests.flatMap((item) => item.log)), "logg", logIds);
  assignIds(state.frame.activity, "aktivitet", activityIds);
  return {
    marketplace: {
      ...state.marketplace,
      requests: requests.map((request) => ({
        ...request,
        id: mapped(requestIds, request.id),
        log: request.log.map((event) => ({
          ...event,
          id: mapped(logIds, event.id),
        })),
      })),
      conversations: conversations.map((conversation) => ({
        ...conversation,
        id: mapped(conversationIds, conversation.id),
        requestId: mapped(requestIds, conversation.requestId),
        messages: conversation.messages.map((item) => ({
          ...item,
          id: mapped(messageIds, item.id),
        })),
      })),
    },
    activity: state.frame.activity.map((entry) => ({
      ...entry,
      id: mapped(activityIds, entry.id),
      target: {
        route: `/oppdrag/${mapped(requestIds, entry.target.route.replace("/oppdrag/", ""))}`,
      },
    })),
  };
}

export function seedMarketplace(
  _rng: Rng,
  frame: FrameSeed,
): { key: "marketplace"; data: MarketplaceState; activity: ActivityEntry[] } {
  const history = createHistory(frame);
  const { run, publish, message } = history;

  const vinter = publish("person-4", "2026-10-30T09:00:00+01:00", "bedrift-3", {
    title: "Markedsføring av vinterkolleksjonen",
    description:
      "Vi lanserer en ny kolleksjon med strikkeplagg til vinteren og trenger hjelp til å nå flere kunder. Oppgaven er å lage innhold til sosiale medier og sette opp et enkelt nyhetsbrev som følger kampanjen.",
    requiredSkillIds: ["ferdighet-6", "ferdighet-12"],
    acceptedSuggestionIds: [],
    additionalRequirements: "Erfaring fra mote eller håndverk er en fordel.",
    desiredStartDate: "2026-12-14",
    estimatedDuration: { amount: 6, unit: "weeks" },
    hoursPerWeek: 10,
    workLocation: "remote",
  });
  message(
    vinter,
    "person-8",
    "person-4",
    "2026-10-30T15:10:00+01:00",
    "Hei Mats! Vi lanserer en vinterkolleksjon og trenger hjelp med sosiale medier og nyhetsbrev. Når kan du starte?",
  );
  message(
    vinter,
    "person-8",
    "person-8",
    "2026-10-31T10:30:00+01:00",
    "Hei Anne! Jeg kan starte 23. november og har jobbet mye med nyhetsbrev.",
  );
  run("person-4", "2026-11-02T14:20:00+01:00", {
    type: "rejectShortlist",
    requestId: vinter,
    reason:
      "Ingen av dem har erfaring med strikk og mote, og jeg trenger noen som kan skrive tekster som passer stilen vår.",
  });

  const pakking = publish(
    "person-5",
    "2026-11-03T10:00:00+01:00",
    "bedrift-4",
    {
      title: "Hjelp med pakking og sending før jul",
      description:
        "Kaffeabonnementene våre vokser fort, og vi trenger en ekstra hånd på lageret i førjulstiden. Du pakker og sender bestillinger, holder orden på lageret og svarer på enkle spørsmål fra kunder.",
      requiredSkillIds: ["ferdighet-9", "ferdighet-15", "ferdighet-8"],
      acceptedSuggestionIds: [],
      additionalRequirements: "Du må kunne løfte opptil 15 kilo.",
      desiredStartDate: "2026-11-23",
      estimatedDuration: { amount: 6, unit: "weeks" },
      hoursPerWeek: 15,
      workLocation: "onsite",
    },
  );
  publish("person-3", "2026-11-03T11:30:00+01:00", "bedrift-2", {
    title: "Regnskap og bilag før årsslutt",
    description:
      "Vi har samlet opp bilag gjennom hele sesongen og trenger hjelp til å få orden på regnskapet før årsslutt. Oppgaven er å registrere bilag og avstemme tallene mot nettbutikken.",
    requiredSkillIds: ["ferdighet-4", "ferdighet-17"],
    acceptedSuggestionIds: [],
    desiredStartDate: "2026-12-01",
    estimatedDuration: { amount: 8, unit: "weeks" },
    hoursPerWeek: 8,
    workLocation: "remote",
  });
  run("person-5", "2026-11-04T09:15:00+01:00", {
    type: "inviteToInterview",
    requestId: pakking,
    workerId: "person-12",
  });
  message(
    pakking,
    "person-12",
    "person-5",
    "2026-11-04T09:20:00+01:00",
    "Hei Omar! Vi trenger hjelp med pakking og sending før jul. Kan du starte mandag 23. november?",
  );
  message(
    pakking,
    "person-12",
    "person-12",
    "2026-11-04T11:05:00+01:00",
    "Hei Ola! Ja, det passer fint. Jeg har jobbet på lager før og kan ta 15 timer i uken.",
  );
  message(
    pakking,
    "person-12",
    "person-5",
    "2026-11-04T12:50:00+01:00",
    "Flott, da sender jeg deg et tilbud nå.",
  );
  run("person-5", "2026-11-04T13:00:00+01:00", {
    type: "makeOffer",
    requestId: pakking,
    workerId: "person-12",
  });
  run("person-12", "2026-11-05T08:30:00+01:00", {
    type: "acceptOffer",
    requestId: pakking,
  });
  message(
    pakking,
    "person-12",
    "person-12",
    "2026-11-05T08:40:00+01:00",
    "Takk for tilbudet, jeg gleder meg til å komme i gang!",
  );

  const julesalg = publish(
    "person-1",
    "2026-11-05T09:30:00+01:00",
    "bedrift-1",
    {
      title: "Innhold og sosiale medier til julesalget",
      description:
        "Julesalget er det viktigste for keramikkbutikken vår. Vi trenger noen som kan lage gode innlegg, bilder og tekster til sosiale medier, slik at flere finner veien til nettbutikken.",
      requiredSkillIds: ["ferdighet-6", "ferdighet-5"],
      acceptedSuggestionIds: [],
      additionalRequirements: "Vi vil gjerne ha et fast publiseringsprogram.",
      desiredStartDate: "2026-12-10",
      estimatedDuration: { amount: 8, unit: "weeks" },
      hoursPerWeek: 8,
      workLocation: "remote",
    },
  );
  run("person-1", "2026-11-06T09:00:00+01:00", {
    type: "inviteToInterview",
    requestId: julesalg,
    workerId: "person-9",
  });
  message(
    julesalg,
    "person-9",
    "person-1",
    "2026-11-06T09:05:00+01:00",
    "Hei Amina! Vi er en liten keramikkbutikk i Kristiansand og trenger hjelp med innhold til julesalget. Har du tid til en kort prat denne uken?",
  );
  message(
    julesalg,
    "person-9",
    "person-9",
    "2026-11-06T12:30:00+01:00",
    "Hei Kari! Det høres spennende ut. Torsdag formiddag passer fint for meg.",
  );
  message(
    julesalg,
    "person-9",
    "person-1",
    "2026-11-06T13:10:00+01:00",
    "Perfekt, da tar vi det torsdag klokken 10. Jeg sender en lenke i morgen.",
  );

  const design = publish("person-4", "2026-11-09T10:00:00+01:00", "bedrift-3", {
    title: "Ny design på nettbutikken",
    description:
      "Nettbutikken vår ser litt gammeldags ut, og vi vil ha et enklere og mer innbydende design som fungerer godt på mobil. Du setter opp og tilpasser en moderne Shopify-mal.",
    requiredSkillIds: ["ferdighet-7", "ferdighet-2"],
    acceptedSuggestionIds: [],
    desiredStartDate: "2026-12-01",
    estimatedDuration: { amount: 5, unit: "weeks" },
    hoursPerWeek: 12,
    workLocation: "remote",
  });
  run("person-4", "2026-11-10T15:00:00+01:00", {
    type: "inviteToInterview",
    requestId: design,
    workerId: "person-8",
  });
  message(
    design,
    "person-8",
    "person-4",
    "2026-11-10T15:05:00+01:00",
    "Hei Mats! Vi trenger nytt design på nettbutikken før vinteren. Har du lyst til å ta en prat?",
  );
  message(
    design,
    "person-8",
    "person-8",
    "2026-11-11T08:20:00+01:00",
    "Absolutt! Jeg har satt opp flere Shopify-butikker for små bedrifter. Passer det torsdag?",
  );
  publish("person-3", "2026-11-11T09:00:00+01:00", "bedrift-2", {
    title: "Nye bilder av honningproduktene",
    description:
      "Vi har fått ny etikett på glassene og trenger profesjonelle produktbilder til nettbutikken. Bildene skal brukes på produktsidene og i sosiale medier.",
    requiredSkillIds: ["ferdighet-1", "ferdighet-13"],
    acceptedSuggestionIds: [],
    desiredStartDate: "2026-12-14",
    estimatedDuration: { amount: 1, unit: "weeks" },
    hoursPerWeek: 20,
    workLocation: "onsite",
  });
  publish("person-7", "2026-11-12T13:20:00+01:00", "bedrift-5", {
    title: "Oversette produktbeskrivelser til engelsk",
    description:
      "Vi vil nå flere kunder i utlandet og trenger noen som kan oversette produktbeskrivelsene våre til engelsk, og gjøre teksten tydelig og salgsfremmende.",
    requiredSkillIds: ["ferdighet-14", "ferdighet-10"],
    acceptedSuggestionIds: [],
    desiredStartDate: "2026-11-23",
    estimatedDuration: { amount: 6, unit: "weeks" },
    hoursPerWeek: 10,
    workLocation: "remote",
  });
  message(
    design,
    "person-8",
    "person-4",
    "2026-11-12T16:40:00+01:00",
    "Takk for praten i dag, Mats. Jeg sender deg et tilbud snart.",
  );
  publish("person-1", "2026-11-13T09:10:00+01:00", "bedrift-1", {
    title: "Oppdatere nettsiden med nye produkter",
    description:
      "Vi har fått en ny serie med kopper og skåler og trenger hjelp til å legge dem inn i nettbutikken, med bilder, tekster og riktige kategorier.",
    requiredSkillIds: ["ferdighet-18", "ferdighet-2"],
    acceptedSuggestionIds: [],
    desiredStartDate: "2026-12-01",
    estimatedDuration: { amount: 4, unit: "weeks" },
    hoursPerWeek: 10,
    workLocation: "remote",
  });
  run("person-4", "2026-11-14T10:00:00+01:00", {
    type: "makeOffer",
    requestId: design,
    workerId: "person-8",
  });

  const result = renumber(history.current());
  return {
    key: "marketplace",
    data: result.marketplace,
    activity: result.activity,
  };
}
