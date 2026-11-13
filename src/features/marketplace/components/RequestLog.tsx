import { useId } from "react";
import { personName } from "../../../domain/marketplace/log";
import type { TaskRequest } from "../../../domain/marketplace/types";
import { visibleLogEvents } from "../../../domain/marketplace/visibility";
import { useDemoState } from "../../../frame/store/store";
import { EmptyState } from "../../../frame/ui/EmptyState";
import { SimulatedLabel } from "../../../frame/ui/SimulatedLabel";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { formatDateTime } from "../format";
import "./RequestLog.css";

export function RequestLog({
  request,
  hideHeading = false,
}: {
  request: TaskRequest;
  hideHeading?: boolean;
}) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const headingId = useId();

  const events = [...visibleLogEvents(person, request, state)].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at),
  );

  return (
    <section className="request-log" aria-labelledby={headingId}>
      <h2
        id={headingId}
        className={hideHeading ? "visually-hidden" : undefined}
      >
        Logg
      </h2>
      {events.length === 0 ? (
        <EmptyState title="Ingen hendelser ennå" />
      ) : (
        <ol className="request-log-events" aria-labelledby={headingId}>
          {events.map((event) => (
            <li key={event.id} className="request-log-event">
              <p className="request-log-meta">
                <time dateTime={event.at}>{formatDateTime(event.at)}</time>
                <span>{personName(state, event.actor)}</span>
                {event.simulated === true && <SimulatedLabel />}
              </p>
              <p className="request-log-text">{event.text}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
