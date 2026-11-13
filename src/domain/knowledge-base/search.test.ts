import { describe, expect, it } from "vitest";
import { questionsByTopic, searchQuestions, similarQuestions } from "./search";
import { answer, kbState, question, seedState } from "./testState";

function ids(questions: { id: string }[]): string[] {
  return questions.map((item) => item.id);
}

const state = kbState({
  questions: [
    question("q-frakt", {
      title: "Frakt til hele landet",
      description: "Vi vil sende keramikk med Posten.",
      createdAt: "2026-11-01T09:00:00+01:00",
    }),
    question("q-betaling", {
      title: "Betalingsmåter i nettbutikken",
      description: "Vipps og kort, hva er best?",
      createdAt: "2026-11-02T09:00:00+01:00",
    }),
    question("q-nyhetsbrev", {
      title: "Nyhetsbrev som folk leser",
      description: "Hvor ofte bør vi sende frakt og tilbud?",
      topicId: "tema-2",
      createdAt: "2026-11-03T09:00:00+01:00",
    }),
    question("q-fjernet", {
      title: "Frakt som er fjernet",
      description: "Frakt og pakker.",
      moderation: "removed",
      createdAt: "2026-11-04T09:00:00+01:00",
    }),
    question("q-bilder", {
      title: "Bedre produktbilder",
      description: "Lys og bakgrunn til bilder av keramikk.",
      topicId: "tema-2",
      createdAt: "2026-11-05T09:00:00+01:00",
    }),
  ],
  answers: [
    answer("a-bobleplast", "q-betaling", {
      text: "Pakk alt i bobleplast og bruk Vipps.",
    }),
    answer("a-fjernet", "q-bilder", {
      text: "Hemmelig svar om rabattkoder.",
      moderation: "removed",
    }),
    answer("a-flagget", "q-bilder", {
      text: "Prøv en lysboks.",
      moderation: "flagged",
    }),
  ],
});

describe("searchQuestions", () => {
  it("finner et spørsmål på et ord som bare står i et svar", () => {
    expect(ids(searchQuestions("bobleplast", state))).toEqual(["q-betaling"]);
  });

  it("finner ikke et spørsmål på et ord som bare står i et fjernet svar", () => {
    expect(searchQuestions("rabattkoder", state)).toEqual([]);
  });

  it("finner et spørsmål på et ord i et flagget svar", () => {
    expect(ids(searchQuestions("lysboks", state))).toEqual(["q-bilder"]);
  });

  it("viser aldri fjernede spørsmål", () => {
    expect(ids(searchQuestions("pakker", state))).not.toContain("q-fjernet");
  });

  it("utelater spørsmål uten treff", () => {
    expect(ids(searchQuestions("nyhetsbrev", state))).toEqual(["q-nyhetsbrev"]);
  });

  it("matcher ordstart for ord på minst fire bokstaver", () => {
    expect(ids(searchQuestions("nettbutikk", state))).toEqual(["q-betaling"]);
    expect(ids(searchQuestions("bilde", state))).toEqual(["q-bilder"]);
  });

  it("rangerer etter antall treffende ord, så titteltreff, så nyeste", () => {
    const ranked = kbState({
      questions: [
        question("a", {
          title: "Noe annet",
          description: "Frakt og keramikk",
          createdAt: "2026-11-01T09:00:00+01:00",
        }),
        question("b", {
          title: "Frakt",
          description: "Ingenting mer",
          createdAt: "2026-11-02T09:00:00+01:00",
        }),
        question("c", {
          title: "Frakt keramikk",
          description: "Ingenting mer",
          createdAt: "2026-11-03T09:00:00+01:00",
        }),
        question("d", {
          title: "Frakt keramikk",
          description: "Også her",
          createdAt: "2026-11-04T09:00:00+01:00",
        }),
        question("e", {
          title: "Keramikk",
          description: "Frakt",
          createdAt: "2026-11-05T09:00:00+01:00",
        }),
      ],
    });

    expect(ids(searchQuestions("frakt keramikk", ranked))).toEqual([
      "d",
      "c",
      "e",
      "a",
      "b",
    ]);
  });

  it("gir tom liste for tomt søk eller søk med bare stoppord", () => {
    expect(searchQuestions("", state)).toEqual([]);
    expect(searchQuestions("   ", state)).toEqual([]);
    expect(searchQuestions("hvordan kan jeg", state)).toEqual([]);
  });
});

describe("similarQuestions", () => {
  it("krever minst to felles ord", () => {
    expect(ids(similarQuestions("Frakt", "", state)), "ett felles ord").toEqual(
      [],
    );
    expect(
      ids(similarQuestions("Frakt til landet", "Keramikk med Posten", state)),
    ).toEqual(["q-frakt"]);
  });

  it("ser bare på tittel og beskrivelse, ikke på svar", () => {
    expect(similarQuestions("bobleplast Vipps", "", state)).toEqual([]);
    expect(ids(similarQuestions("Vipps kort", "betaling", state))).toEqual([
      "q-betaling",
    ]);
  });

  it("utelater fjernede spørsmål", () => {
    expect(
      ids(similarQuestions("Frakt som er fjernet", "Frakt og pakker", state)),
    ).not.toContain("q-fjernet");
  });

  it("gir høyst tre, i samme rekkefølge som søk", () => {
    const many = kbState({
      questions: [1, 2, 3, 4, 5].map((number) =>
        question(`q-${number}`, {
          title: "Frakt keramikk",
          description: "Posten",
          createdAt: `2026-11-0${number}T09:00:00+01:00`,
        }),
      ),
    });

    expect(ids(similarQuestions("Frakt keramikk", "Posten", many))).toEqual([
      "q-5",
      "q-4",
      "q-3",
    ]);
  });
});

describe("questionsByTopic", () => {
  it("gir synlige spørsmål i temaet, nyeste først", () => {
    expect(ids(questionsByTopic("tema-2", state))).toEqual([
      "q-bilder",
      "q-nyhetsbrev",
    ]);
    expect(ids(questionsByTopic("tema-1", state))).toEqual([
      "q-betaling",
      "q-frakt",
    ]);
  });

  it("gir tom liste for et ukjent tema", () => {
    expect(questionsByTopic("tema-99", state)).toEqual([]);
  });
});

describe("de ferdige nesten-like spørsmålene", () => {
  it("finner spørsmålet de er skrevet for å treffe", () => {
    const seed = seedState();
    for (const example of seed.knowledgeBase.nearDuplicateExamples) {
      const found = similarQuestions(example.title, example.description, seed);
      expect(ids(found), example.id).toContain(example.matchesQuestionId);
    }
  });
});
