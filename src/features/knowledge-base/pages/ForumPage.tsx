import { useNavigate } from "react-router";
import { canPost } from "../../../domain/knowledge-base/permissions";
import { visibleQuestions } from "../../../domain/knowledge-base/status";
import { useDemoState } from "../../../frame/store/store";
import { useLayout } from "../../../frame/store/useLayout";
import { Button } from "../../../frame/ui/Button";
import { Disclosure } from "../../../frame/ui/Disclosure";
import { EmptyState } from "../../../frame/ui/EmptyState";
import { Link } from "../../../frame/ui/Link";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { QuestionRow } from "../components/QuestionRow";
import { newestFirst } from "../lists";
import "./ForumPage.css";

const newestLimit = 10;

function TopicList() {
  const state = useDemoState();
  const questions = visibleQuestions(state);

  return (
    <ul className="forum-topics">
      {state.knowledgeBase.topics.map((topic) => (
        <li key={topic.id} className="forum-topic">
          <p className="forum-topic-name">
            <Link href={`/kunnskapsbank/tema/${topic.id}`}>{topic.name}</Link>
          </p>
          <p className="forum-topic-description">{topic.description}</p>
          <p className="forum-topic-count">
            {questions.filter((item) => item.topicId === topic.id).length}{" "}
            spørsmål
          </p>
        </li>
      ))}
    </ul>
  );
}

function NewestQuestions() {
  const state = useDemoState();
  const newest = [...visibleQuestions(state)]
    .sort(newestFirst)
    .slice(0, newestLimit);

  if (newest.length === 0) {
    return (
      <EmptyState title="Ingen spørsmål ennå">
        <p>Bli den første til å spørre de andre bedriftene.</p>
      </EmptyState>
    );
  }
  return (
    <ul className="forum-questions" aria-labelledby="forum-nyeste-overskrift">
      {newest.map((question) => (
        <QuestionRow key={question.id} question={question} />
      ))}
    </ul>
  );
}

export function ForumPage() {
  const state = useDemoState();
  const person = useCurrentPerson();
  const layout = useLayout();
  const navigate = useNavigate();

  const newest = (
    <section
      className="forum-section"
      aria-labelledby="forum-nyeste-overskrift"
    >
      <h2 id="forum-nyeste-overskrift">Nyeste spørsmål</h2>
      <NewestQuestions />
    </section>
  );

  return (
    <>
      <PageHeading>Kunnskapsbank</PageHeading>
      {canPost(person, state) && (
        <div className="forum-toolbar">
          <Button onPress={() => navigate("/kunnskapsbank/sporsmal/ny")}>
            Still et spørsmål
          </Button>
        </div>
      )}
      {layout === "desktop" ? (
        <div className="forum-columns" data-layout="desktop">
          <section
            className="forum-section"
            aria-labelledby="forum-tema-overskrift"
          >
            <h2 id="forum-tema-overskrift">Tema</h2>
            <TopicList />
          </section>
          {newest}
        </div>
      ) : (
        <div className="forum-columns" data-layout="mobile">
          <Disclosure title="Tema" headingLevel={2}>
            <TopicList />
          </Disclosure>
          {newest}
        </div>
      )}
    </>
  );
}
