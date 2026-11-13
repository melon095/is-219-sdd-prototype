import { describe, expect, it } from "vitest";
import type { DemoState } from "../../src/domain/frame/types";
import { similarQuestions } from "../../src/domain/knowledge-base/search";
import { questionStatus } from "../../src/domain/knowledge-base/status";
import {
  matchScore,
  tokenize,
  wordsMatch,
} from "../../src/domain/knowledge-base/text";
import { knowledgeBaseStateSchema } from "../../src/features/knowledge-base/schema";
import { marketplaceStateSchema } from "../../src/features/marketplace/schema";
import { buildSeedFileSchema } from "../../src/frame/store/schema";
import { buildSeedFile } from "./generate";

const seedFileSchema = buildSeedFileSchema({
  marketplace: marketplaceStateSchema,
  knowledgeBase: knowledgeBaseStateSchema,
});

const seed = seedFileSchema.parse(JSON.parse(buildSeedFile()));
const kb = seed.knowledgeBase;
const { people, businesses } = seed.frame;

const state: DemoState = {
  meta: {
    seedId: seed.seedId,
    anchorDate: seed.anchorDate,
    loadedAt: `${seed.anchorDate}T08:00:00+01:00`,
  },
  frame: seed.frame,
  marketplace: seed.marketplace,
  knowledgeBase: kb,
};

const authors = ["person-1", "person-2", "person-3", "person-5"];

const day = 24 * 60 * 60 * 1000;

const anchor = Date.parse(`${seed.anchorDate}T00:00:00+01:00`);

function answersTo(questionId: string) {
  return kb.answers.filter((item) => item.questionId === questionId);
}

function businessOfPerson(personId: string) {
  return businesses.find(
    (business) =>
      business.ownerId === personId || business.employeeIds.includes(personId),
  );
}

function chatbotSourceAnswerIds(): Set<string> {
  return new Set(
    kb.chatbotQuestions.flatMap((item) => item.answer?.sourceAnswerIds ?? []),
  );
}

describe("seeded topics", () => {
  it("has exactly the 5 topics, each with a description", () => {
    expect(kb.topics.map((topic) => [topic.id, topic.name])).toEqual([
      ["tema-1", "Nettbutikk"],
      ["tema-2", "Teknisk hjelp"],
      ["tema-3", "Kunstig intelligens"],
      ["tema-4", "Markedsføring"],
      ["tema-5", "Drift og regnskap"],
    ]);
    for (const topic of kb.topics) {
      expect(topic.description.length).toBeGreaterThan(0);
    }
  });

  it("has at least 2 visible questions in every topic", () => {
    for (const topic of kb.topics) {
      const visible = kb.questions.filter(
        (item) => item.topicId === topic.id && item.moderation !== "removed",
      );
      expect(visible.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("seeded questions", () => {
  it("has 12–20 questions written only by the four members", () => {
    expect(kb.questions.length).toBeGreaterThanOrEqual(12);
    expect(kb.questions.length).toBeLessThanOrEqual(20);
    for (const item of kb.questions) {
      expect(authors).toContain(item.authorId);
    }
  });

  it("comes from at least 3 businesses", () => {
    expect(
      new Set(kb.questions.map((item) => item.businessId)).size,
    ).toBeGreaterThanOrEqual(3);
  });

  it("has both open and answered questions", () => {
    const statuses = kb.questions.map((item) => questionStatus(item, state));
    expect(statuses).toContain("open");
    expect(statuses).toContain("answered");
  });

  it("has at least one question with 3 or more answers", () => {
    expect(kb.questions.some((item) => answersTo(item.id).length >= 3)).toBe(
      true,
    );
  });

  it("has at least one question answered by the asker's colleague", () => {
    expect(
      kb.answers.some((item) => {
        const asked = kb.questions.find(
          (candidate) => candidate.id === item.questionId,
        );
        return (
          asked !== undefined &&
          asked.authorId !== item.authorId &&
          asked.businessId === item.businessId
        );
      }),
    ).toBe(true);
  });

  it("has at least 2 questions about using AI tools such as Claude", () => {
    const aiQuestions = kb.questions.filter(
      (item) => item.topicId === "tema-3" && /claude|ki\b/i.test(item.title),
    );
    expect(aiQuestions.length).toBeGreaterThanOrEqual(2);
  });

  it("has every author write at least one question and one answer", () => {
    for (const author of authors) {
      expect(kb.questions.some((item) => item.authorId === author)).toBe(true);
      expect(kb.answers.some((item) => item.authorId === author)).toBe(true);
    }
  });

  it("gives every author's content the business they work at", () => {
    for (const item of [...kb.questions, ...kb.answers]) {
      expect(businessOfPerson(item.authorId)?.id).toBe(item.businessId);
    }
  });

  it("starts every item as current with no edits", () => {
    for (const item of [...kb.questions, ...kb.answers]) {
      expect(item.moderation).toBe("current");
      expect(item.editedAt).toBeUndefined();
    }
  });

  it("uses fixed times between 30 and 3 days before the anchor date", () => {
    for (const item of [...kb.questions, ...kb.answers]) {
      const at = Date.parse(item.createdAt);
      expect(at).toBeGreaterThanOrEqual(anchor - 30 * day);
      expect(at).toBeLessThanOrEqual(anchor - 3 * day);
    }
  });

  it("posts every answer after its question", () => {
    for (const item of kb.answers) {
      const asked = kb.questions.find(
        (candidate) => candidate.id === item.questionId,
      );
      expect(asked).toBeDefined();
      expect(Date.parse(item.createdAt)).toBeGreaterThan(
        Date.parse(asked?.createdAt ?? ""),
      );
    }
  });

  it("uses counter ids", () => {
    kb.questions.forEach((item, index) => {
      expect(item.id).toBe(`sporsmal-${index + 1}`);
    });
    kb.answers.forEach((item, index) => {
      expect(item.id).toBe(`svar-${index + 1}`);
    });
  });
});

describe("seeded answers", () => {
  it("has at least one answer with a word found in no question and in no other answer", () => {
    const questionWords = kb.questions.flatMap((item) =>
      tokenize(`${item.title} ${item.description}`),
    );
    const found = kb.answers.some((item) => {
      const others = kb.answers
        .filter((other) => other.id !== item.id)
        .flatMap((other) => tokenize(other.text));
      return tokenize(item.text).some(
        (word) =>
          !questionWords.some((candidate) => wordsMatch(word, candidate)) &&
          !others.some((candidate) => wordsMatch(word, candidate)),
      );
    });
    expect(found).toBe(true);
  });

  it("has at least two answers by Ola, one that is not a chatbot source and has no flag", () => {
    const ola = kb.answers.filter((item) => item.authorId === "person-5");
    expect(ola.length).toBeGreaterThanOrEqual(2);
    const sources = chatbotSourceAnswerIds();
    expect(
      ola.some(
        (item) =>
          !sources.has(item.id) &&
          !kb.flags.some((flag) => flag.targetId === item.id),
      ),
    ).toBe(true);
  });
});

describe("references", () => {
  it("points every authorId, businessId, topicId, and questionId at an existing record", () => {
    const personIds = new Set(people.map((person) => person.id));
    const businessIds = new Set(businesses.map((business) => business.id));
    const topicIds = new Set(kb.topics.map((topic) => topic.id));
    const questionIds = new Set(kb.questions.map((item) => item.id));
    for (const item of kb.questions) {
      expect(personIds.has(item.authorId)).toBe(true);
      expect(businessIds.has(item.businessId)).toBe(true);
      expect(topicIds.has(item.topicId)).toBe(true);
    }
    for (const item of kb.answers) {
      expect(personIds.has(item.authorId)).toBe(true);
      expect(businessIds.has(item.businessId)).toBe(true);
      expect(questionIds.has(item.questionId)).toBe(true);
    }
  });
});

describe("knowledge base activity", () => {
  const entries = seed.frame.activity.filter(
    (entry) => entry.featureId === "knowledgeBase",
  );

  it("has one entry per question and answer", () => {
    expect(entries).toHaveLength(kb.questions.length + kb.answers.length);
  });

  it("requires the members group on every entry", () => {
    for (const entry of entries) {
      expect(entry.audience.requiredGroup).toBe("knowledgeBase.members");
    }
  });

  it("links every entry to an existing question", () => {
    const routes = new Set(
      kb.questions.map((item) => `/kunnskapsbank/sporsmal/${item.id}`),
    );
    for (const entry of entries) {
      expect(routes.has(entry.target.route)).toBe(true);
    }
  });

  it("uses counter ids", () => {
    expect(entries.map((entry) => entry.id)).toEqual(
      entries.map((_, index) => `aktivitet-kb-${index + 1}`),
    );
  });
});

describe("near-duplicate examples", () => {
  const examples = kb.nearDuplicateExamples;

  function targetOf(matchesQuestionId: string) {
    return kb.questions.find((item) => item.id === matchesQuestionId);
  }

  it("has exactly 3 examples with the ids duplikat-1 to duplikat-3", () => {
    expect(examples.map((example) => example.id)).toEqual([
      "duplikat-1",
      "duplikat-2",
      "duplikat-3",
    ]);
  });

  it("points each example at a visible seeded question", () => {
    for (const example of examples) {
      const target = targetOf(example.matchesQuestionId);
      expect(target, example.id).toBeDefined();
      expect(target?.moderation, example.id).not.toBe("removed");
    }
  });

  it("points the three examples at three different questions", () => {
    expect(
      new Set(examples.map((example) => example.matchesQuestionId)).size,
    ).toBe(3);
  });

  it("words each example differently from the title of its target", () => {
    for (const example of examples) {
      expect(example.title, example.id).not.toBe(
        targetOf(example.matchesQuestionId)?.title,
      );
    }
  });

  it("shares at least 2 content words with the title or description of its target", () => {
    for (const example of examples) {
      const target = targetOf(example.matchesQuestionId);
      const shared = matchScore(
        tokenize(`${example.title} ${example.description}`),
        tokenize(`${target?.title} ${target?.description}`),
      );
      expect(shared, example.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("finds the target of each example among the similar questions", () => {
    for (const example of examples) {
      const found = similarQuestions(example.title, example.description, state);
      expect(
        found.map((item) => item.id),
        example.id,
      ).toContain(example.matchesQuestionId);
    }
  });

  it("keeps every title within 120 characters", () => {
    for (const example of examples) {
      expect(example.title.length, example.id).toBeGreaterThan(0);
      expect(example.title.length, example.id).toBeLessThanOrEqual(120);
    }
  });
});

describe("knowledge base state", () => {
  it("passes the knowledge base schema", () => {
    expect(knowledgeBaseStateSchema.safeParse(kb).success).toBe(true);
  });
});
