import { personById } from "../../../domain/frame/people";
import {
  findTarget,
  flagsOfReview,
  threadQuestion,
} from "../../../domain/knowledge-base/helpers";
import type { Review } from "../../../domain/knowledge-base/types";
import { useDemoState } from "../../../frame/store/store";
import { Link } from "../../../frame/ui/Link";
import { StatusBadge } from "../../../frame/ui/StatusBadge";
import { FlagList } from "./FlagList";
import { ReviewActions } from "./ReviewActions";
import "./ReviewItem.css";

export function ReviewItem({
  review,
  focusAfter,
}: {
  review: Review;
  focusAfter: string;
}) {
  const state = useDemoState();
  const item = findTarget(state, review);

  if (item === undefined) {
    return null;
  }
  const question = threadQuestion(state, item);
  const author = personById(item.authorId, state);
  const business = state.frame.businesses.find(
    (candidate) => candidate.id === item.businessId,
  );
  const text = "text" in item ? item.text : item.description;
  const isQuestion = review.targetKind === "question";

  return (
    <li className="review-item" data-review-id={review.id} tabIndex={-1}>
      <div className="review-item-heading">
        <StatusBadge label={isQuestion ? "Spørsmål" : "Svar"} tone="info" />
        <h3>
          <Link href={`/kunnskapsbank/sporsmal/${question?.id ?? ""}`}>
            {question?.title}
          </Link>
        </h3>
      </div>
      <p className="review-item-text">{text}</p>
      <p className="review-item-meta">
        <span>{author?.name}</span>
        <span>{business?.name}</span>
      </p>
      <FlagList flags={flagsOfReview(state, review)} />
      <ReviewActions
        review={review}
        focusAfterClear={focusAfter}
        focusAfterRemove={focusAfter}
      />
    </li>
  );
}
