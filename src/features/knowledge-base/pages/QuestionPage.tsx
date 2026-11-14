import { type FormEvent, useState } from "react";
import { useParams } from "react-router";
import { isAdmin, personById } from "../../../domain/frame/people";
import { openReviewFor } from "../../../domain/knowledge-base/helpers";
import {
  canEditQuestion,
  canPost,
  canReview,
} from "../../../domain/knowledge-base/permissions";
import { questionsByTopic } from "../../../domain/knowledge-base/search";
import {
  questionStatus,
  visibleAnswers,
} from "../../../domain/knowledge-base/status";
import type { Question } from "../../../domain/knowledge-base/types";
import { NotFoundPage } from "../../../frame/home/NotFoundPage";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { useLayout } from "../../../frame/store/useLayout";
import { Button } from "../../../frame/ui/Button";
import { Link } from "../../../frame/ui/Link";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { TextArea } from "../../../frame/ui/TextArea";
import { focusAfterRender } from "../../../frame/ui/useFocusAfter";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { AnswerItem } from "../components/AnswerItem";
import { FlagDialog } from "../components/FlagDialog";
import { FlagWarning } from "../components/FlagWarning";
import { QuestionStatusBadge } from "../components/QuestionStatusBadge";
import { ReviewActions } from "../components/ReviewActions";
import { formatDate, formatDateTime } from "../format";
import "./QuestionPage.css";

const sideLimit = 5;

function QuestionDetails({ question }: { question: Question }) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const topic = state.knowledgeBase.topics.find(
    (item) => item.id === question.topicId,
  );
  const business = state.frame.businesses.find(
    (item) => item.id === question.businessId,
  );
  const author = personById(question.authorId, state);
  const target = { targetKind: "question" as const, targetId: question.id };
  const openReview = openReviewFor(state, target);

  return (
    <section
      className="question-details"
      aria-label="Spørsmålet"
      data-question-id={question.id}
      tabIndex={-1}
    >
      <div className="question-details-status">
        <QuestionStatusBadge status={questionStatus(question, state)} />
        {canEditQuestion(person, question) && (
          <Link href={`/kunnskapsbank/sporsmal/${question.id}/rediger`}>
            Rediger
          </Link>
        )}
        <FlagDialog target={target} />
        {canReview(person) && openReview !== undefined && (
          <ReviewActions
            review={openReview}
            focusAfterClear={`[data-question-id="${question.id}"]`}
            focusAfterRemove="h1"
          />
        )}
      </div>
      <FlagWarning target={target} />
      <dl className="question-details-facts">
        <div>
          <dt>Tema</dt>
          <dd>
            <Link href={`/kunnskapsbank/tema/${question.topicId}`}>
              {topic?.name}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Bedrift</dt>
          <dd>{business?.name}</dd>
        </div>
        <div>
          <dt>Stilt av</dt>
          <dd>{author?.name}</dd>
        </div>
        <div>
          <dt>Dato</dt>
          <dd>
            <time dateTime={question.createdAt}>
              {formatDate(question.createdAt)}
            </time>
          </dd>
        </div>
      </dl>
      {question.editedAt !== undefined && (
        <p className="question-details-edited">
          Endret {formatDateTime(question.editedAt)}
        </p>
      )}
      <p className="question-details-description">{question.description}</p>
    </section>
  );
}

function Answers({ question }: { question: Question }) {
  const state = useDemoState();
  const answers = visibleAnswers(question.id, state);

  return (
    <section className="question-answers" aria-labelledby="svar-overskrift">
      <h2 id="svar-overskrift" tabIndex={-1}>
        {answers.length} svar
      </h2>
      {answers.length === 0 ? (
        <p>Ingen har svart ennå.</p>
      ) : (
        <ul className="question-answer-list">
          {answers.map((answer) => (
            <AnswerItem key={answer.id} answer={answer} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AnswerForm({ question }: { question: Question }) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  if (isAdmin(person)) {
    return (
      <Notice tone="info">
        Som Varodd-ansatt kan du lese, men ikke skrive i kunnskapsbanken.
      </Notice>
    );
  }
  if (!canPost(person, state)) {
    return null;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = dispatch({
      type: "postAnswer",
      questionId: question.id,
      text,
    });
    if (!result.ok) {
      setError(result.error.fieldErrors?.text ?? result.error.message);
      return;
    }
    setText("");
    setError(undefined);
    announce("Svaret er publisert");
    const created = result.state.knowledgeBase.answers.at(-1);
    if (created !== undefined) {
      focusAfterRender(`[data-answer-id="${created.id}"]`);
    }
  };

  return (
    <form className="answer-form" onSubmit={submit} noValidate>
      <TextArea
        label="Skriv et svar"
        rows={6}
        value={text}
        onChange={setText}
        isInvalid={error !== undefined}
        errorMessage={error}
      />
      <div>
        <Button type="submit">Publiser svar</Button>
      </div>
    </form>
  );
}

function SidePanel({ question }: { question: Question }) {
  const state = useDemoState();
  const layout = useLayout();
  const topic = state.knowledgeBase.topics.find(
    (item) => item.id === question.topicId,
  );
  const answerCount = visibleAnswers(question.id, state).length;
  const others = questionsByTopic(question.topicId, state)
    .filter((item) => item.id !== question.id)
    .slice(0, sideLimit);

  const content = (
    <>
      <h2 id="sidepanel-overskrift">Om spørsmålet</h2>
      <dl className="question-side-facts">
        <div>
          <dt>Tema</dt>
          <dd>
            <Link href={`/kunnskapsbank/tema/${question.topicId}`}>
              {topic?.name}
            </Link>
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <QuestionStatusBadge status={questionStatus(question, state)} />
          </dd>
        </div>
        <div>
          <dt>Antall svar</dt>
          <dd>{answerCount}</dd>
        </div>
      </dl>
      {others.length > 0 && (
        <>
          <h3 id="flere-overskrift">Flere spørsmål i temaet</h3>
          <ul className="question-side-list" aria-labelledby="flere-overskrift">
            {others.map((item) => (
              <li key={item.id}>
                <Link href={`/kunnskapsbank/sporsmal/${item.id}`}>
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );

  return layout === "desktop" ? (
    <aside className="question-side" aria-labelledby="sidepanel-overskrift">
      {content}
    </aside>
  ) : (
    <section className="question-side" aria-labelledby="sidepanel-overskrift">
      {content}
    </section>
  );
}

function QuestionView({ question }: { question: Question }) {
  const layout = useLayout();

  if (question.moderation === "removed") {
    return (
      <>
        <PageHeading>Spørsmålet er fjernet</PageHeading>
        <p>
          Varodd har fjernet dette spørsmålet fordi det ikke passet i forumet.
        </p>
        <p>
          <Link href="/kunnskapsbank">Tilbake til forumet</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeading>{question.title}</PageHeading>
      <div className="question-columns" data-layout={layout}>
        <div className="question-main">
          <QuestionDetails question={question} />
          <Answers question={question} />
          <AnswerForm question={question} />
          {layout === "mobile" && <SidePanel question={question} />}
        </div>
        {layout === "desktop" && <SidePanel question={question} />}
      </div>
    </>
  );
}

export function QuestionPage() {
  const { questionId } = useParams();
  const state = useDemoState();

  const question = state.knowledgeBase.questions.find(
    (item) => item.id === questionId,
  );
  if (question === undefined) {
    return <NotFoundPage />;
  }
  return <QuestionView key={question.id} question={question} />;
}
