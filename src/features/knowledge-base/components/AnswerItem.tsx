import { useState } from "react";
import { personById } from "../../../domain/frame/people";
import { openReviewFor } from "../../../domain/knowledge-base/helpers";
import {
  canEditAnswer,
  canReview,
} from "../../../domain/knowledge-base/permissions";
import type { Answer } from "../../../domain/knowledge-base/types";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { Button } from "../../../frame/ui/Button";
import { TextArea } from "../../../frame/ui/TextArea";
import { focusAfterRender } from "../../../frame/ui/useFocusAfter";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { formatDate, formatDateTime } from "../format";
import { FlagDialog } from "./FlagDialog";
import { FlagWarning } from "./FlagWarning";
import { ReviewActions } from "./ReviewActions";
import "./AnswerItem.css";

export function AnswerItem({ answer }: { answer: Answer }) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(answer.text);
  const [error, setError] = useState<string | undefined>(undefined);

  const business = state.frame.businesses.find(
    (item) => item.id === answer.businessId,
  );
  const author = personById(answer.authorId, state);
  const selector = `[data-answer-id="${answer.id}"]`;
  const target = { targetKind: "answer" as const, targetId: answer.id };
  const openReview = openReviewFor(state, target);

  const startEditing = () => {
    setText(answer.text);
    setError(undefined);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(undefined);
    focusAfterRender(selector);
  };

  const save = () => {
    const result = dispatch({
      type: "editAnswer",
      answerId: answer.id,
      text,
    });
    if (!result.ok) {
      setError(result.error.fieldErrors?.text ?? result.error.message);
      return;
    }
    setEditing(false);
    setError(undefined);
    focusAfterRender(selector);
  };

  return (
    <li className="answer-item" data-answer-id={answer.id} tabIndex={-1}>
      <p className="answer-item-meta">
        <strong>{business?.name}</strong>
        <span>{author?.name}</span>
        <time dateTime={answer.createdAt}>{formatDate(answer.createdAt)}</time>
        {answer.editedAt !== undefined && (
          <span>Endret {formatDateTime(answer.editedAt)}</span>
        )}
      </p>
      <FlagWarning target={target} />
      {editing ? (
        <div className="answer-item-edit">
          <TextArea
            label="Svaret ditt"
            rows={6}
            value={text}
            onChange={setText}
            isInvalid={error !== undefined}
            errorMessage={error}
          />
          <div className="answer-item-actions">
            <Button onPress={save}>Lagre</Button>
            <Button variant="secondary" onPress={cancel}>
              Avbryt
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="answer-item-text">{answer.text}</p>
          <div className="answer-item-actions">
            {canEditAnswer(person, answer) && (
              <Button variant="quiet" onPress={startEditing}>
                Rediger
              </Button>
            )}
            <FlagDialog target={target} />
            {canReview(person) && openReview !== undefined && (
              <ReviewActions
                review={openReview}
                focusAfterClear={selector}
                focusAfterRemove="#svar-overskrift"
              />
            )}
          </div>
        </>
      )}
    </li>
  );
}
