import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { canPost } from "../../../domain/knowledge-base/permissions";
import {
  questionsByTopic,
  searchQuestions,
} from "../../../domain/knowledge-base/search";
import { visibleQuestions } from "../../../domain/knowledge-base/status";
import { useDemoState } from "../../../frame/store/store";
import { useLayout } from "../../../frame/store/useLayout";
import { Button } from "../../../frame/ui/Button";
import { Disclosure } from "../../../frame/ui/Disclosure";
import { EmptyState } from "../../../frame/ui/EmptyState";
import { Link } from "../../../frame/ui/Link";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { SearchField } from "../../../frame/ui/SearchField";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { QuestionRow } from "../components/QuestionRow";
import { newestFirst } from "../lists";
import "./ForumPage.css";

const newestLimit = 10;

function TopicList() {
  const state = useDemoState();

  return (
    <ul className="forum-topics">
      {state.knowledgeBase.topics.map((topic) => (
        <li key={topic.id} className="forum-topic">
          <p className="forum-topic-name">
            <Link href={`/kunnskapsbank/tema/${topic.id}`}>{topic.name}</Link>
          </p>
          <p className="forum-topic-description">{topic.description}</p>
          <p className="forum-topic-count">
            {questionsByTopic(topic.id, state).length} spørsmål
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

function NewestSection() {
  return (
    <section
      className="forum-section"
      aria-labelledby="forum-nyeste-overskrift"
    >
      <h2 id="forum-nyeste-overskrift">Nyeste spørsmål</h2>
      <NewestQuestions />
    </section>
  );
}

function SearchResults({ query }: { query: string }) {
  const state = useDemoState();
  const announce = useAnnounce();
  const results = searchQuestions(query, state);
  const heading = `${results.length} treff for «${query}»`;

  useEffect(() => {
    announce(heading);
  }, [announce, heading]);

  return (
    <section className="forum-section" aria-labelledby="forum-treff-overskrift">
      <h2 id="forum-treff-overskrift">{heading}</h2>
      {results.length === 0 ? (
        <EmptyState title="Vi fant ingen spørsmål som passer. Prøv andre ord, eller still spørsmålet selv." />
      ) : (
        <ul
          className="forum-questions"
          aria-labelledby="forum-treff-overskrift"
        >
          {results.map((question) => (
            <QuestionRow key={question.id} question={question} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ForumPage() {
  const state = useDemoState();
  const person = useCurrentPerson();
  const layout = useLayout();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = (params.get("sok") ?? "").trim();
  const [text, setText] = useState(query);
  const searching = query !== "";

  useEffect(() => {
    setText(query);
  }, [query]);

  const submit = (value: string) => {
    const trimmed = value.trim();
    setParams(trimmed === "" ? {} : { sok: trimmed });
  };

  const change = (value: string) => {
    setText(value);
    if (value === "" && searching) {
      setParams({});
    }
  };

  const search = (
    <SearchField
      label="Søk i forumet"
      description="Skriv noen ord og trykk Enter."
      value={text}
      onChange={change}
      onSubmit={submit}
    />
  );
  const content = searching ? (
    <SearchResults query={query} />
  ) : (
    <NewestSection />
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
        <div
          className="forum-columns"
          data-layout="desktop"
          data-searching={searching}
        >
          {!searching && (
            <section
              className="forum-section"
              aria-labelledby="forum-tema-overskrift"
            >
              <h2 id="forum-tema-overskrift">Tema</h2>
              <TopicList />
            </section>
          )}
          <div className="forum-main">
            {search}
            {content}
          </div>
        </div>
      ) : (
        <div className="forum-columns" data-layout="mobile">
          {search}
          {!searching && (
            <Disclosure title="Tema" headingLevel={2}>
              <TopicList />
            </Disclosure>
          )}
          {content}
        </div>
      )}
    </>
  );
}
