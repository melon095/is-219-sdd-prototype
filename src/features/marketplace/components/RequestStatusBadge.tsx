import { statusLabel } from "../../../domain/marketplace/log";
import type { RequestStatus } from "../../../domain/marketplace/types";
import { StatusBadge, type StatusTone } from "../../../frame/ui/StatusBadge";

const tones: Record<RequestStatus, StatusTone> = {
  open: "info",
  shortlisted: "info",
  offered: "warning",
  agreed: "success",
  "in-progress": "success",
  completed: "neutral",
  cancelled: "error",
  "under-review": "warning",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <StatusBadge label={statusLabel(status)} tone={tones[status]} />;
}
