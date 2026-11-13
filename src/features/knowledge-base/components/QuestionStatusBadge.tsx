import type { QuestionStatus } from "../../../domain/knowledge-base/types";
import { StatusBadge } from "../../../frame/ui/StatusBadge";

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  return status === "answered" ? (
    <StatusBadge label="Besvart" tone="success" />
  ) : (
    <StatusBadge label="Åpent" tone="neutral" />
  );
}
