import type { Question } from "../../domain/knowledge-base/types";

export function newestFirst(a: Question, b: Question): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}
