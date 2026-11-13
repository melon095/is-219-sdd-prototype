import type { IsoDateTime } from "../../domain/frame/types";

const dateFormat = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(at: IsoDateTime): string {
  return dateFormat.format(new Date(at));
}

export function formatDateTime(at: IsoDateTime): string {
  return dateTimeFormat.format(new Date(at));
}
