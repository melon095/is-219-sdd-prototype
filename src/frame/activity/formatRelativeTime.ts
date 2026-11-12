import type { IsoDateTime } from "../../domain/frame/types";

const formatter = new Intl.RelativeTimeFormat("nb-NO", { numeric: "auto" });

export function formatRelativeTime(at: IsoDateTime, now: IsoDateTime): string {
  const seconds = Math.floor((Date.parse(now) - Date.parse(at)) / 1000);
  if (seconds < 60) {
    return formatter.format(0, "second");
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return formatter.format(-minutes, "minute");
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return formatter.format(-hours, "hour");
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return formatter.format(-days, "day");
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return formatter.format(-months, "month");
  }
  return formatter.format(-Math.floor(days / 365), "year");
}
