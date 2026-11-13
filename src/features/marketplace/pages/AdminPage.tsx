import { useState } from "react";
import { DialogTrigger } from "react-aria-components";
import { isAdmin, workerProfileOf } from "../../../domain/frame/people";
import type { Command } from "../../../domain/frame/types";
import {
  canCancelRequest,
  canReturnToOpen,
  canSimulateCrawl,
  canSimulateNavReferral,
} from "../../../domain/marketplace/permissions";
import { RequireAccess } from "../../../frame/layout/RequireAccess";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { AlertDialog } from "../../../frame/ui/AlertDialog";
import { Button } from "../../../frame/ui/Button";
import { EmptyState } from "../../../frame/ui/EmptyState";
import { Link } from "../../../frame/ui/Link";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { SimulatedLabel } from "../../../frame/ui/SimulatedLabel";
import { useFocusAfter } from "../../../frame/ui/useFocusAfter";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { formatDateTime } from "../format";
import "./AdminPage.css";

function AdminContent() {
  const state = useDemoState();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const focusAfter = useFocusAfter();
  const person = useCurrentPerson();
  const [error, setError] = useState<string | undefined>(undefined);

  const underReview = state.marketplace.requests.filter(
    (request) => request.status === "under-review",
  );
  const withoutProfile = state.frame.people.filter(
    (candidate) =>
      candidate.seeksWork && workerProfileOf(candidate.id, state) === undefined,
  );

  const crawlRuns = [...state.marketplace.crawlRuns].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );
  const afterReview = (id: string) => {
    const next = neighbour(underReview, id);
    return next === undefined
      ? "#til-vurdering"
      : `[data-request-id="${next.id}"]`;
  };
  const afterReferral = (id: string) => {
    const next = neighbour(withoutProfile, id);
    return next === undefined
      ? "#nav-henvisning"
      : `[data-person-id="${next.id}"]`;
  };
  const businessNames = (businessIds: string[]) =>
    businessIds.length === 0
      ? "ingen"
      : businessIds
          .map(
            (id) =>
              state.frame.businesses.find((business) => business.id === id)
                ?.name ?? id,
          )
          .join(", ");

  const neighbour = <T extends { id: string }>(items: T[], id: string) => {
    const index = items.findIndex((item) => item.id === id);
    return items[index + 1] ?? items[index - 1];
  };

  const run = (command: Command, message: string, focusSelector?: string) => {
    const result = dispatch(command);
    if (result.ok) {
      setError(undefined);
      announce(message);
      if (focusSelector !== undefined) {
        focusAfter(focusSelector);
      }
    } else {
      setError(result.error.message);
    }
  };

  return (
    <>
      <PageHeading>Varodd-verktøy</PageHeading>
      {error !== undefined && <Notice tone="error">{error}</Notice>}
      <section className="admin-section" aria-labelledby="til-vurdering">
        <h2 id="til-vurdering" tabIndex={-1}>
          Til vurdering
        </h2>
        {underReview.length === 0 ? (
          <EmptyState title="Ingen oppdrag venter på vurdering">
            <p>Når en eier avviser en kortliste, dukker oppdraget opp her.</p>
          </EmptyState>
        ) : (
          <ul className="admin-review-list">
            {underReview.map((request) => (
              <li
                key={request.id}
                className="admin-review-item"
                data-request-id={request.id}
                tabIndex={-1}
              >
                <h3>
                  <Link href={`/oppdrag/${request.id}`}>{request.title}</Link>
                </h3>
                <p>
                  {
                    state.frame.businesses.find(
                      (business) => business.id === request.businessId,
                    )?.name
                  }
                </p>
                <p>Begrunnelse fra eieren: {request.rejection?.reason}</p>
                <div className="admin-review-actions">
                  {canReturnToOpen(person, request) && (
                    <Button
                      onPress={() =>
                        run(
                          { type: "returnToOpen", requestId: request.id },
                          "Oppdraget er åpent igjen",
                          afterReview(request.id),
                        )
                      }
                    >
                      Gjør åpen igjen
                    </Button>
                  )}
                  {canCancelRequest(person, request, state) && (
                    <DialogTrigger>
                      <Button variant="secondary">Avlys</Button>
                      <AlertDialog
                        title="Avlys oppdraget?"
                        text="Eieren og de som er på kortlisten får beskjed."
                        reasonLabel="Hvorfor avlyses oppdraget?"
                        confirmLabel="Avlys oppdraget"
                        cancelLabel="Avbryt"
                        onConfirm={(reason) =>
                          run(
                            {
                              type: "cancelRequest",
                              requestId: request.id,
                              reason: reason ?? "",
                            },
                            "Oppdraget er avlyst",
                            afterReview(request.id),
                          )
                        }
                      />
                    </DialogTrigger>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="admin-section" aria-labelledby="nav-henvisning">
        <h2 id="nav-henvisning" tabIndex={-1}>
          Simulert NAV-henvisning
        </h2>
        <p>
          Her kan du henvise en som søker oppdrag, som om personen kom fra NAV.
          Personen får en utkastprofil og må fylle den ut selv.
        </p>
        {withoutProfile.length === 0 ? (
          <EmptyState title="Alle som søker oppdrag har allerede en profil">
            <p>Det er ingen å henvise akkurat nå.</p>
          </EmptyState>
        ) : (
          <ul className="admin-nav-list">
            {withoutProfile.map((candidate) => (
              <li
                key={candidate.id}
                className="admin-nav-item"
                data-person-id={candidate.id}
                tabIndex={-1}
              >
                <div className="admin-nav-person">
                  <span className="admin-nav-name">{candidate.name}</span>
                  <span>{candidate.description}</span>
                </div>
                <SimulatedLabel />
                {canSimulateNavReferral(person, candidate.id, state) && (
                  <Button
                    variant="secondary"
                    onPress={() =>
                      run(
                        { type: "simulateNavReferral", personId: candidate.id },
                        `${candidate.name} er henvist fra NAV (simulert)`,
                        afterReferral(candidate.id),
                      )
                    }
                  >
                    Henvis fra NAV (simulert)
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="admin-section" aria-labelledby="gjennomgang">
        <h2 id="gjennomgang">Simulert gjennomgang av nettsider</h2>
        <p>
          Her kan du kjøre en simulert gjennomgang av nettsidene til bedriftene
          som har sagt ja til forslag. Bedriftene får nye forslag til
          ferdigheter. Oppdrag som allerede er laget blir ikke endret.
        </p>
        <div className="admin-crawl-action">
          <Button
            variant="secondary"
            isDisabled={!canSimulateCrawl(person)}
            onPress={() =>
              run(
                { type: "simulateCrawl" },
                "Den simulerte gjennomgangen er kjørt",
              )
            }
          >
            Kjør simulert gjennomgang
          </Button>
          <SimulatedLabel />
        </div>
        {crawlRuns.length === 0 ? (
          <EmptyState title="Ingen gjennomgang er kjørt ennå">
            <p>Når du kjører en gjennomgang, vises den her.</p>
          </EmptyState>
        ) : (
          <ul className="admin-crawl-list">
            {crawlRuns.map((crawlRun) => (
              <li key={crawlRun.id} className="admin-crawl-item">
                <time dateTime={crawlRun.at}>
                  {formatDateTime(crawlRun.at)}
                </time>
                <p>Gjennomgått: {businessNames(crawlRun.crawledBusinessIds)}</p>
                <p>Hoppet over: {businessNames(crawlRun.skippedBusinessIds)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export function AdminPage() {
  return (
    <RequireAccess allowed={(person) => isAdmin(person)}>
      <AdminContent />
    </RequireAccess>
  );
}
