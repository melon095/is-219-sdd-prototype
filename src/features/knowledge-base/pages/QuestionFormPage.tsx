import { type FormEvent, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { isAdmin } from "../../../domain/frame/people";
import type { Id } from "../../../domain/frame/types";
import {
  canEditQuestion,
  canView,
} from "../../../domain/knowledge-base/permissions";
import type { Question } from "../../../domain/knowledge-base/types";
import { NotFoundPage } from "../../../frame/home/NotFoundPage";
import { RequireAccess } from "../../../frame/layout/RequireAccess";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { Button } from "../../../frame/ui/Button";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { Select, SelectItem } from "../../../frame/ui/Select";
import { TextArea } from "../../../frame/ui/TextArea";
import { TextField } from "../../../frame/ui/TextField";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import "./QuestionFormPage.css";

const titleLimit = 120;

type FormProps = {
  question?: Question;
  initialTopicId?: Id;
};

function QuestionForm({ question, initialTopicId }: FormProps) {
  const state = useDemoState();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const navigate = useNavigate();

  const [topicId, setTopicId] = useState<string | null>(
    question?.topicId ?? initialTopicId ?? null,
  );
  const [title, setTitle] = useState(question?.title ?? "");
  const [description, setDescription] = useState(question?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const fields = {
      topicId: topicId ?? undefined,
      title,
      description,
    };
    const result =
      question === undefined
        ? dispatch({ type: "postQuestion", ...fields })
        : dispatch({
            type: "editQuestion",
            questionId: question.id,
            ...fields,
          });
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setFormError(result.error.message);
      return;
    }
    setErrors({});
    setFormError(undefined);
    if (question === undefined) {
      const created = result.state.knowledgeBase.questions.at(-1);
      announce("Spørsmålet er publisert");
      navigate(`/kunnskapsbank/sporsmal/${created?.id ?? ""}`);
    } else {
      announce("Endringene er lagret");
      navigate(`/kunnskapsbank/sporsmal/${question.id}`);
    }
  };

  return (
    <form className="question-form" onSubmit={submit} noValidate>
      {formError !== undefined && <Notice tone="error">{formError}</Notice>}
      <Select
        label="Tema"
        placeholder="Velg tema"
        selectedKey={topicId}
        onSelectionChange={(key) =>
          setTopicId(key === null ? null : String(key))
        }
        isInvalid={errors.topicId !== undefined}
        errorMessage={errors.topicId}
      >
        {state.knowledgeBase.topics.map((topic) => (
          <SelectItem key={topic.id} id={topic.id}>
            {topic.name}
          </SelectItem>
        ))}
      </Select>
      <TextField
        label="Tittel"
        value={title}
        onChange={setTitle}
        description={`${title.length} av ${titleLimit} tegn`}
        isInvalid={errors.title !== undefined}
        errorMessage={errors.title}
      />
      <TextArea
        label="Beskriv spørsmålet"
        rows={8}
        value={description}
        onChange={setDescription}
        isInvalid={errors.description !== undefined}
        errorMessage={errors.description}
      />
      <div className="question-form-actions">
        <Button type="submit">
          {question === undefined ? "Publiser spørsmålet" : "Lagre endringer"}
        </Button>
      </div>
    </form>
  );
}

function NewQuestionPage() {
  const state = useDemoState();
  const person = useCurrentPerson();
  const [params] = useSearchParams();
  const requested = params.get("tema");
  const initialTopicId = state.knowledgeBase.topics.find(
    (topic) => topic.id === requested,
  )?.id;

  return (
    <RequireAccess allowed={canView}>
      <PageHeading>Still et spørsmål</PageHeading>
      {isAdmin(person) ? (
        <Notice tone="info">
          Som Varodd-ansatt kan du lese, men ikke skrive i kunnskapsbanken.
        </Notice>
      ) : (
        <div className="question-form-layout">
          <QuestionForm initialTopicId={initialTopicId} />
        </div>
      )}
    </RequireAccess>
  );
}

function EditQuestionPage({ questionId }: { questionId: Id }) {
  const state = useDemoState();
  const question = state.knowledgeBase.questions.find(
    (item) => item.id === questionId,
  );

  if (question === undefined) {
    return <NotFoundPage />;
  }
  return (
    <RequireAccess allowed={(person) => canEditQuestion(person, question)}>
      <PageHeading>Rediger spørsmål</PageHeading>
      <div className="question-form-layout">
        <QuestionForm key={question.id} question={question} />
      </div>
    </RequireAccess>
  );
}

export function QuestionFormPage() {
  const { questionId } = useParams();

  if (questionId === undefined) {
    return <NewQuestionPage />;
  }
  return <EditQuestionPage questionId={questionId} />;
}
