import type { ActivityEntry } from "../../src/domain/frame/types";
import {
  emptyKnowledgeBaseState,
  type KnowledgeBaseState,
} from "../../src/domain/knowledge-base/types";
import type { FrameSeed } from "./frame";
import type { Rng } from "./random";

export function seedKnowledgeBase(
  _rng: Rng,
  _frame: FrameSeed,
): {
  key: "knowledgeBase";
  data: KnowledgeBaseState;
  activity: ActivityEntry[];
} {
  return {
    key: "knowledgeBase",
    data: emptyKnowledgeBaseState(),
    activity: [],
  };
}
