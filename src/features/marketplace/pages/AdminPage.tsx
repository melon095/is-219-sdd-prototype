import { useState } from "react";
import { DialogTrigger } from "react-aria-components";
import { isAdmin } from "../../../domain/frame/people";
import type { Command } from "../../../domain/frame/types";
import { canReturnToOpen } from "../../../domain/marketplace/permissions";
import { RequireAccess } from "../../../frame/layout/RequireAccess";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { AlertDialog } from "../../../frame/ui/AlertDialog";
import { Button } from "../../../frame/ui/Button";
import { EmptyState } from "../../../frame/ui/EmptyState";
import { Link } from "../../../frame/ui/Link";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import "./AdminPage.css";

function AdminContent() {
  const state = useDemoState();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const person = useCurrentPerson();
  const [error, setError] = useState<string | undefined>(undefined);

  const underReview = state.marketplace.requests.filter(
    (request) => request.status === "under-review",
  );

  const run = (command: Command, message: string) => {
    const result = dispatch(command);
    if (result.ok) {
      setError(undefined);
      announce(message);
    } else {
      setError(result.error.message);
    }
  };

  return (
    <>
      <PageHeading>Varodd-verktøy</PageHeading>
      <section className="admin-section" aria-labelledby="til-vurdering">
        <h2 id="til-vurdering">Til vurdering</h2>
        {error !== undefined && <Notice tone="error">{error}</Notice>}
        {underReview.length === 0 ? (
          <EmptyState title="Ingen oppdrag venter på vurdering">
            <p>Når en eier avviser en kortliste, dukker oppdraget opp her.</p>
          </EmptyState>
        ) : (
          <ul className="admin-review-list">
            {underReview.map((request) => (
              <li key={request.id} className="admin-review-item">
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
                        )
                      }
                    >
                      Gjør åpen igjen
                    </Button>
                  )}
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
                        )
                      }
                    />
                  </DialogTrigger>
                </div>
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
