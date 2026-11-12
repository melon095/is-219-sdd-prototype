import { useState } from "react";
import { allAudienceGroups, features } from "../../app/features";
import { visibleActivity } from "../../domain/frame/activity";
import type { IsoDateTime } from "../../domain/frame/types";
import { useDemoState } from "../store/store";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Link } from "../ui/Link";
import { useCurrentPerson } from "../users/useCurrentPerson";
import { formatRelativeTime } from "./formatRelativeTime";
import "./ActivityFeed.css";

const pageSize = 20;

function featureLabel(featureId: string): string {
  return (
    features.find((feature) => feature.id === featureId)?.label ?? featureId
  );
}

export function ActivityFeed({ now }: { now?: IsoDateTime }) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const [shown, setShown] = useState(pageSize);
  const currentTime = now ?? new Date().toISOString();

  const entries = visibleActivity(state, person, allAudienceGroups);

  return (
    <section className="activity-feed" aria-labelledby="aktivitet-overskrift">
      <h2 id="aktivitet-overskrift">Siste aktivitet</h2>
      {entries.length === 0 ? (
        <EmptyState title="Ingenting har skjedd ennå">
          <p>Her dukker det opp en melding hver gang noe skjer.</p>
        </EmptyState>
      ) : (
        <>
          <ul className="activity-feed-list">
            {entries.slice(0, shown).map((entry) => (
              <li key={entry.id}>
                <Link href={entry.target.route}>
                  <span className="activity-feed-text">{entry.text}</span>
                  <span className="activity-feed-meta">
                    <span>{featureLabel(entry.featureId)}</span>
                    <time dateTime={entry.at}>
                      {formatRelativeTime(entry.at, currentTime)}
                    </time>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {entries.length > shown && (
            <Button
              variant="secondary"
              onPress={() => setShown((count) => count + pageSize)}
            >
              Vis flere
            </Button>
          )}
        </>
      )}
    </section>
  );
}
