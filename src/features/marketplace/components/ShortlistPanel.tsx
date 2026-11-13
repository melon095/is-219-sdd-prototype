import { useId, useState } from "react";
import { DialogTrigger } from "react-aria-components";
import { workerProfileOf } from "../../../domain/frame/people";
import type { Command } from "../../../domain/frame/types";
import { experienceLabel, personName } from "../../../domain/marketplace/log";
import {
  canInviteToInterview,
  canMakeOffer,
  canRejectShortlist,
} from "../../../domain/marketplace/permissions";
import type {
  ShortlistEntry,
  TaskRequest,
} from "../../../domain/marketplace/types";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { AlertDialog } from "../../../frame/ui/AlertDialog";
import { Button } from "../../../frame/ui/Button";
import { EmptyState } from "../../../frame/ui/EmptyState";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { StatusBadge } from "../../../frame/ui/StatusBadge";
import { useFocusAfter } from "../../../frame/ui/useFocusAfter";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { formatDate } from "../format";
import "./ShortlistPanel.css";

export function ShortlistPanel({
  request,
  hideHeading = false,
}: {
  request: TaskRequest;
  hideHeading?: boolean;
}) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const headingId = useId();
  const [error, setError] = useState<string | undefined>(undefined);
  const focusAfter = useFocusAfter();

  const entries = request.shortlist
    .filter((entry) => entry.state !== "removed")
    .sort((a, b) => a.rank - b.rank);
  const skillName = (id: string) =>
    state.frame.skills.find((skill) => skill.id === id)?.name ?? id;

  const run = (command: Command, message: string, focusSelector: string) => {
    const result = dispatch(command);
    if (result.ok) {
      setError(undefined);
      announce(message);
      focusAfter(focusSelector);
    } else {
      setError(result.error.message);
    }
  };

  const canInvite = (entry: ShortlistEntry) =>
    canInviteToInterview(person, request, state, entry.workerId);
  const canOffer = (entry: ShortlistEntry) =>
    canMakeOffer(person, request, state, entry.workerId);
  const canReject = canRejectShortlist(person, request, state);

  return (
    <section className="shortlist-panel" aria-labelledby={headingId}>
      <h2
        id={headingId}
        data-focus="shortlist-heading"
        tabIndex={-1}
        className={hideHeading ? "visually-hidden" : undefined}
      >
        Kortliste
      </h2>
      {error !== undefined && <Notice tone="error">{error}</Notice>}
      {entries.length === 0 ? (
        <EmptyState title="Ingen på kortlisten ennå">
          <p>Vi legger til folk så snart noen passer ferdighetene.</p>
        </EmptyState>
      ) : (
        <ol className="shortlist-entries" aria-labelledby={headingId}>
          {entries.map((entry) => {
            const profile = workerProfileOf(entry.workerId, state);
            const name = personName(state, entry.workerId);
            const matched = entry.matchedSkillIds.map(skillName);
            const missing = entry.missingSkillIds.map(skillName);
            return (
              <li
                key={entry.workerId}
                className="shortlist-entry"
                data-worker-id={entry.workerId}
                tabIndex={-1}
              >
                <div className="shortlist-entry-head">
                  <h3>{name}</h3>
                  <span className="shortlist-entry-rank">Nr. {entry.rank}</span>
                </div>
                <div className="shortlist-entry-badges">
                  {profile?.navReferral !== undefined && (
                    <StatusBadge label="Henvist fra NAV" tone="info" />
                  )}
                  {entry.interviewInvitedAt !== undefined && (
                    <StatusBadge label="Invitert til intervju" tone="info" />
                  )}
                  {entry.state === "offered" && (
                    <StatusBadge
                      label={
                        request.agreement?.workerId === entry.workerId
                          ? "Har takket ja"
                          : "Har fått tilbud"
                      }
                      tone="warning"
                    />
                  )}
                </div>
                <p>
                  Passer: {matched.length > 0 ? matched.join(", ") : "ingen"}
                </p>
                <p>
                  Mangler: {missing.length > 0 ? missing.join(", ") : "ingen"}
                </p>
                {profile?.experienceLevel !== undefined && (
                  <p>Erfaring: {experienceLabel(profile.experienceLevel)}</p>
                )}
                {profile?.availableFrom !== undefined && (
                  <p>Kan starte: {formatDate(profile.availableFrom)}</p>
                )}
                {(canInvite(entry) || canOffer(entry)) && (
                  <div className="shortlist-entry-actions">
                    {canInvite(entry) && (
                      <Button
                        variant="secondary"
                        onPress={() =>
                          run(
                            {
                              type: "inviteToInterview",
                              requestId: request.id,
                              workerId: entry.workerId,
                            },
                            `${name} er invitert til intervju`,
                            `[data-worker-id="${entry.workerId}"]`,
                          )
                        }
                      >
                        Inviter til intervju
                      </Button>
                    )}
                    {canOffer(entry) && (
                      <Button
                        onPress={() =>
                          run(
                            {
                              type: "makeOffer",
                              requestId: request.id,
                              workerId: entry.workerId,
                            },
                            `Du har gitt ${name} et tilbud`,
                            `[data-worker-id="${entry.workerId}"]`,
                          )
                        }
                      >
                        Gi tilbud
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {canReject && (
        <div className="shortlist-reject">
          <DialogTrigger>
            <Button variant="quiet">Avvis hele kortlisten</Button>
            <AlertDialog
              title="Avvis hele kortlisten?"
              text="Alle på kortlisten blir tatt av, og oppdraget går til vurdering hos Varodd."
              reasonLabel="Hvorfor passer ingen av disse?"
              confirmLabel="Avvis kortlisten"
              cancelLabel="Avbryt"
              onConfirm={(reason) =>
                run(
                  {
                    type: "rejectShortlist",
                    requestId: request.id,
                    reason: reason ?? "",
                  },
                  "Kortlisten er avvist",
                  '[data-focus="shortlist-heading"]',
                )
              }
            />
          </DialogTrigger>
        </div>
      )}
    </section>
  );
}
