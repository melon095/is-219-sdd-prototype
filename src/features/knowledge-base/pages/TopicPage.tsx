import { useNavigate, useParams } from "react-router";
import { canPost } from "../../../domain/knowledge-base/permissions";
import { questionsByTopic } from "../../../domain/knowledge-base/search";
import { NotFoundPage } from "../../../frame/home/NotFoundPage";
import { useDemoState } from "../../../frame/store/store";
import { Button } from "../../../frame/ui/Button";
import { EmptyState } from "../../../frame/ui/EmptyState";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { QuestionRow } from "../components/QuestionRow";
import "./TopicPage.css";

export function TopicPage() {
  const { topicId } = useParams();
  const state = useDemoState();
  const person = useCurrentPerson();
  const navigate = useNavigate();
  const topic = state.knowledgeBase.topics.find((item) => item.id === topicId);

  if (topic === undefined) {
    return <NotFoundPage />;
  }
  const questions = questionsByTopic(topic.id, state);

  return (
    <>
      <PageHeading>{topic.name}</PageHeading>
      <p className="topic-description">{topic.description}</p>
      {canPost(person, state) && (
        <div className="topic-toolbar">
          <Button
            onPress={() =>
              navigate(`/kunnskapsbank/sporsmal/ny?tema=${topic.id}`)
            }
          >
            Still et spørsmål i dette temaet
          </Button>
        </div>
      )}
      {questions.length === 0 ? (
        <EmptyState title="Ingen spørsmål i dette temaet ennå">
          <p>Bli den første til å spørre de andre bedriftene.</p>
        </EmptyState>
      ) : (
        <ul className="topic-questions">
          {questions.map((question) => (
            <QuestionRow key={question.id} question={question} />
          ))}
        </ul>
      )}
    </>
  );
}
