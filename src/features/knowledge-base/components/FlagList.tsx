import { personById } from "../../../domain/frame/people";
import type { Flag } from "../../../domain/knowledge-base/types";
import { useDemoState } from "../../../frame/store/store";
import { formatDateTime } from "../format";
import { reasonLabel } from "../labels";
import "./Moderation.css";

export function FlagList({ flags }: { flags: Flag[] }) {
  const state = useDemoState();

  return (
    <ul className="flag-list" aria-label="Hvem som har flagget">
      {flags.map((flag) => (
        <li key={flag.id} className="flag-list-item">
          <strong>{personById(flag.flaggedBy, state)?.name}</strong>
          <span>{reasonLabel(flag.reason)}</span>
          {flag.note !== undefined && (
            <span className="flag-list-note">{flag.note}</span>
          )}
          <time dateTime={flag.at}>{formatDateTime(flag.at)}</time>
        </li>
      ))}
    </ul>
  );
}
