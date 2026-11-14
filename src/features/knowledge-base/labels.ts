import type { FlagReason } from "../../domain/knowledge-base/types";

export const flagReasons: { value: FlagReason; label: string }[] = [
  { value: "outdated", label: "Utdatert" },
  { value: "incorrect", label: "Feil" },
  { value: "spam", label: "Spam" },
  { value: "off-topic", label: "Ikke relevant" },
  { value: "other", label: "Annet" },
];

export function reasonLabel(reason: FlagReason): string {
  return flagReasons.find((item) => item.value === reason)?.label ?? reason;
}
