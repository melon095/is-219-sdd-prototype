import {
  questionStatus,
  visibleAnswers,
} from "../../../domain/knowledge-base/status";
import type { Question } from "../../../domain/knowledge-base/types";
import { useDemoState } from "../../../frame/store/store";
import { Link } from "../../../frame/ui/Link";
import { StatusBadge } from "../../../frame/ui/StatusBadge";
import { formatDate } from "../format";
import { QuestionStatusBadge } from "./QuestionStatusBadge";
import "./QuestionRow.css";

export function QuestionRow({ question }: { question: Question }) {
  const state = useDemoState();
  const topic = state.knowledgeBase.topics.find(
    (item) => item.id === question.topicId,
  );
  const business = state.frame.businesses.find(
    (item) => item.id === question.businessId,
  );
  const answerCount = visibleAnswers(question.id, state).length;

  return (
    <li className="question-row">
      <p className="question-row-title">
        <Link href={`/kunnskapsbank/sporsmal/${question.id}`}>
          {question.title}
        </Link>
      </p>
      <div className="question-row-meta">
        <span>{topic?.name}</span>
        <span>{business?.name}</span>
        <QuestionStatusBadge status={questionStatus(question, state)} />
        {question.moderation === "flagged" && (
          <StatusBadge label="Flagget" tone="warning" />
        )}
        <span>{answerCount} svar</span>
        <time dateTime={question.createdAt}>
          {formatDate(question.createdAt)}
        </time>
      </div>
    </li>
  );
}
