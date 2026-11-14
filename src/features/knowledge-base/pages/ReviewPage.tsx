import { personById } from "../../../domain/frame/people";
import {
  findTarget,
  threadQuestion,
} from "../../../domain/knowledge-base/helpers";
import {
  closedReviews,
  openReviews,
} from "../../../domain/knowledge-base/moderation";
import { canReview } from "../../../domain/knowledge-base/permissions";
import type { Review } from "../../../domain/knowledge-base/types";
import { RequireAccess } from "../../../frame/layout/RequireAccess";
import { useDemoState } from "../../../frame/store/store";
import { EmptyState } from "../../../frame/ui/EmptyState";
import { Link } from "../../../frame/ui/Link";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { StatusBadge } from "../../../frame/ui/StatusBadge";
import { ReviewItem } from "../components/ReviewItem";
import { formatDateTime } from "../format";
import "./ReviewPage.css";

const pastLimit = 10;
const emptyFocus = "#venter-pa-vurdering";

function PastReview({ review }: { review: Review }) {
  const state = useDemoState();
  const item = findTarget(state, review);
  const question = item === undefined ? undefined : threadQuestion(state, item);
  const cleared = review.outcome === "cleared";

  return (
    <li className="review-past-item">
      <StatusBadge
        label={cleared ? "Beholdt" : "Fjernet"}
        tone={cleared ? "success" : "neutral"}
      />
      <Link href={`/kunnskapsbank/sporsmal/${question?.id ?? ""}`}>
        {question?.title}
      </Link>
      <span className="review-past-reviewer">
        {personById(review.reviewedBy ?? "", state)?.name}
      </span>
      {review.reviewedAt !== undefined && (
        <time dateTime={review.reviewedAt}>
          {formatDateTime(review.reviewedAt)}
        </time>
      )}
    </li>
  );
}

function ReviewContent() {
  const state = useDemoState();
  const open = openReviews(state);
  const past = closedReviews(state).slice(0, pastLimit);

  const focusAfter = (review: Review): string => {
    const index = open.findIndex((candidate) => candidate.id === review.id);
    const outsideThread = (candidate: Review) =>
      review.targetKind !== "question" ||
      candidate.targetKind !== "answer" ||
      state.knowledgeBase.answers.find(
        (answer) => answer.id === candidate.targetId,
      )?.questionId !== review.targetId;
    const next = open.slice(index + 1).find(outsideThread);
    const previous = open.slice(0, index).filter(outsideThread).at(-1);
    const neighbour = next ?? previous;
    return neighbour === undefined
      ? emptyFocus
      : `[data-review-id="${neighbour.id}"]`;
  };

  return (
    <>
      <PageHeading>Til vurdering</PageHeading>
      <section className="review-section" aria-labelledby="venter-pa-vurdering">
        <h2 id="venter-pa-vurdering" tabIndex={-1}>
          Venter på vurdering
        </h2>
        {open.length === 0 ? (
          <EmptyState title="Ingenting venter på vurdering." />
        ) : (
          <ul className="review-list">
            {open.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                focusAfter={focusAfter(review)}
              />
            ))}
          </ul>
        )}
      </section>
      {past.length > 0 && (
        <section
          className="review-section"
          aria-labelledby="tidligere-vurderinger"
        >
          <h2 id="tidligere-vurderinger">Tidligere vurderinger</h2>
          <ul className="review-past-list">
            {past.map((review) => (
              <PastReview key={review.id} review={review} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function ReviewPage() {
  return (
    <RequireAccess allowed={(person) => canReview(person)}>
      <ReviewContent />
    </RequireAccess>
  );
}
