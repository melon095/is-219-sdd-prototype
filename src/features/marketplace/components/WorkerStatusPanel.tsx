import { useState } from "react";
import { DialogTrigger } from "react-aria-components";
import { ownerIdOf } from "../../../domain/marketplace/helpers";
import {
  canAcceptOffer,
  canDeclineOffer,
  canWithdraw,
} from "../../../domain/marketplace/permissions";
import type { TaskRequest } from "../../../domain/marketplace/types";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { AlertDialog } from "../../../frame/ui/AlertDialog";
import { Button } from "../../../frame/ui/Button";
import { Card } from "../../../frame/ui/Card";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { useFocusAfter } from "../../../frame/ui/useFocusAfter";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import "./WorkerStatusPanel.css";

export function WorkerStatusPanel({ request }: { request: TaskRequest }) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const focusAfter = useFocusAfter();
  const [error, setError] = useState<string | undefined>(undefined);

  const entry = request.shortlist.find(
    (item) => item.workerId === person.id && item.state !== "removed",
  );
  if (entry === undefined || ownerIdOf(state, request) === person.id) {
    return null;
  }

  const isOffered = canAcceptOffer(person, request, state);
  const canDecline = canDeclineOffer(person, request, state);
  const canLeave = canWithdraw(person, request);
  const isAgreed = request.agreement?.workerId === person.id;

  const accept = () => {
    const result = dispatch({ type: "acceptOffer", requestId: request.id });
    if (result.ok) {
      setError(undefined);
      announce("Du har godtatt tilbudet");
      focusAfter("#din-status-overskrift");
    } else {
      setError(result.error.message);
    }
  };

  const decline = () => {
    const result = dispatch({ type: "declineOffer", requestId: request.id });
    if (result.ok) {
      setError(undefined);
      announce("Du har avslått tilbudet");
      focusAfter("h1");
    } else {
      setError(result.error.message);
    }
  };

  const leave = () => {
    const result = dispatch({ type: "withdraw", requestId: request.id });
    if (result.ok) {
      setError(undefined);
      announce("Du har trukket deg fra oppdraget");
      focusAfter("h1");
    } else {
      setError(result.error.message);
    }
  };

  let text =
    "Du står på kortlisten. Eieren velger hvem de vil jobbe sammen med.";
  if (isOffered) {
    text = "Du har fått et tilbud på dette oppdraget.";
  } else if (isAgreed && request.status === "in-progress") {
    text = "Oppdraget pågår.";
  } else if (isAgreed && request.status === "completed") {
    text = "Oppdraget er fullført.";
  } else if (isAgreed && request.status === "cancelled") {
    text = "Oppdraget er avlyst.";
  } else if (isAgreed) {
    text = "Du og eieren er enige om oppdraget.";
  } else if (entry.interviewInvitedAt !== undefined) {
    text = "Du er invitert til intervju. Bruk meldingene for å avtale tid.";
  }

  return (
    <Card
      heading="Din status"
      headingId="din-status-overskrift"
      action={
        isOffered || canDecline || canLeave ? (
          <div className="worker-status-actions">
            {isOffered && <Button onPress={accept}>Godta</Button>}
            {canDecline && (
              <Button variant="secondary" onPress={decline}>
                Avslå
              </Button>
            )}
            {canLeave && (
              <DialogTrigger>
                <Button variant="secondary">Trekk deg</Button>
                <AlertDialog
                  title="Vil du trekke deg fra oppdraget?"
                  text="Du blir tatt av oppdraget og kommer ikke tilbake på kortlisten for det. Eieren får beskjed."
                  confirmLabel="Trekk deg fra oppdraget"
                  cancelLabel="Avbryt"
                  onConfirm={leave}
                />
              </DialogTrigger>
            )}
          </div>
        ) : undefined
      }
    >
      <p>{text}</p>
      {error !== undefined && <Notice tone="error">{error}</Notice>}
    </Card>
  );
}
