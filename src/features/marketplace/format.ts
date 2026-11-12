import type { IsoDate, IsoDateTime } from "../../domain/frame/types";
import type { EstimatedDuration } from "../../domain/marketplace/types";

const dateFormat = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(date: IsoDate): string {
  const [year, month, day] = date.split("-").map(Number);
  return dateFormat.format(new Date(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

export function formatDateTime(at: IsoDateTime): string {
  return dateTimeFormat.format(new Date(at));
}

export function formatDuration(duration: EstimatedDuration): string {
  if (duration.unit === "weeks") {
    return `${duration.amount} ${duration.amount === 1 ? "uke" : "uker"}`;
  }
  return `${duration.amount} ${duration.amount === 1 ? "måned" : "måneder"}`;
}
