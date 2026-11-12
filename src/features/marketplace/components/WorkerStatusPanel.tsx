import { useState } from "react";
import { ownerIdOf } from "../../../domain/marketplace/helpers";
import { canAcceptOffer } from "../../../domain/marketplace/permissions";
import type { TaskRequest } from "../../../domain/marketplace/types";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { Button } from "../../../frame/ui/Button";
import { Card } from "../../../frame/ui/Card";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";

export function WorkerStatusPanel({ request }: { request: TaskRequest }) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const [error, setError] = useState<string | undefined>(undefined);

  const entry = request.shortlist.find(
    (item) => item.workerId === person.id && item.state !== "removed",
  );
  if (entry === undefined || ownerIdOf(state, request) === person.id) {
    return null;
  }

  const isOffered = canAcceptOffer(person, request, state);
  const isAgreed = request.agreement?.workerId === person.id;

  const accept = () => {
    const result = dispatch({ type: "acceptOffer", requestId: request.id });
    if (result.ok) {
      setError(undefined);
      announce("Du har godtatt tilbudet");
    } else {
      setError(result.error.message);
    }
  };

  let text =
    "Du står på kortlisten. Eieren velger hvem de vil jobbe sammen med.";
  if (isOffered) {
    text = "Du har fått et tilbud på dette oppdraget.";
  } else if (isAgreed) {
    text = "Du og eieren er enige om oppdraget.";
  } else if (entry.interviewInvitedAt !== undefined) {
    text = "Du er invitert til intervju. Bruk meldingene for å avtale tid.";
  }

  return (
    <Card
      heading="Din status"
      action={isOffered ? <Button onPress={accept}>Godta</Button> : undefined}
    >
      <p>{text}</p>
      {error !== undefined && <Notice tone="error">{error}</Notice>}
    </Card>
  );
}
