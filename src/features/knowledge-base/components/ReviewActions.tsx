import { useState } from "react";
import { DialogTrigger } from "react-aria-components";
import type {
  Review,
  ReviewDecision,
} from "../../../domain/knowledge-base/types";
import { useDispatch } from "../../../frame/store/store";
import { AlertDialog } from "../../../frame/ui/AlertDialog";
import { Button } from "../../../frame/ui/Button";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { focusAfterRender } from "../../../frame/ui/useFocusAfter";
import "./Moderation.css";

export function ReviewActions({
  review,
  focusAfterClear,
  focusAfterRemove,
}: {
  review: Review;
  focusAfterClear: string;
  focusAfterRemove: string;
}) {
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const [error, setError] = useState<string | undefined>(undefined);
  const isQuestion = review.targetKind === "question";

  const run = (decision: ReviewDecision) => {
    const result = dispatch({
      type: "reviewContent",
      reviewId: review.id,
      decision,
    });
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setError(undefined);
    announce(
      decision === "clear" ? "Innlegget er beholdt" : "Innlegget er fjernet",
    );
    focusAfterRender(decision === "clear" ? focusAfterClear : focusAfterRemove);
  };

  return (
    <div className="review-actions">
      <Button onPress={() => run("clear")}>Behold</Button>
      <DialogTrigger>
        <Button variant="secondary">Fjern</Button>
        <AlertDialog
          title={isQuestion ? "Fjern spørsmålet?" : "Fjern svaret?"}
          text={
            isQuestion
              ? "Hele tråden blir fjernet, med alle svarene."
              : "Svaret blir fjernet fra forumet."
          }
          confirmLabel="Fjern"
          cancelLabel="Avbryt"
          onConfirm={() => run("remove")}
        />
      </DialogTrigger>
      {error !== undefined && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
