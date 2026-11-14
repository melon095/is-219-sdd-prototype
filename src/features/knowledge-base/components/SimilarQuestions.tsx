import { useEffect, useRef, useState } from "react";
import { similarQuestions } from "../../../domain/knowledge-base/search";
import {
  questionStatus,
  visibleAnswers,
} from "../../../domain/knowledge-base/status";
import { useDemoState } from "../../../frame/store/store";
import { useLayout } from "../../../frame/store/useLayout";
import { Link } from "../../../frame/ui/Link";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { QuestionStatusBadge } from "./QuestionStatusBadge";
import "./SimilarQuestions.css";

const settleDelay = 300;

const excerptLength = 160;

type Typed = { title: string; description: string };

function excerptOf(text: string): string {
  return text.length > excerptLength
    ? `${text.slice(0, excerptLength)}…`
    : text;
}

function countMessage(count: number): string {
  return count === 0
    ? "Vi fant ingen lignende spørsmål"
    : `Vi fant ${count} lignende spørsmål`;
}

export function SimilarQuestions({ title, description }: Typed) {
  const state = useDemoState();
  const layout = useLayout();
  const announce = useAnnounce();
  const [settled, setSettled] = useState<Typed>({
    title: "",
    description: "",
  });
  const announced = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled((previous) =>
        previous.title === title && previous.description === description
          ? previous
          : { title, description },
      );
    }, settleDelay);
    return () => clearTimeout(timer);
  }, [title, description]);

  const matches = similarQuestions(settled.title, settled.description, state);
  const count = matches.length;

  useEffect(() => {
    if (announced.current !== count) {
      announced.current = count;
      announce(countMessage(count));
    }
  }, [announce, count]);

  if (count === 0) {
    return null;
  }

  const content = (
    <>
      <h2 id="similar-overskrift">Har noen spurt om dette før?</h2>
      <ul className="similar-list" aria-labelledby="similar-overskrift">
        {matches.map((question) => {
          const business = state.frame.businesses.find(
            (item) => item.id === question.businessId,
          );
          const first = visibleAnswers(question.id, state)[0];
          return (
            <li key={question.id} className="similar-item">
              <p className="similar-title">
                <Link href={`/kunnskapsbank/sporsmal/${question.id}`}>
                  {question.title}
                </Link>
              </p>
              <div className="similar-meta">
                <QuestionStatusBadge status={questionStatus(question, state)} />
                <span>{business?.name}</span>
              </div>
              {first !== undefined && (
                <p className="similar-excerpt">{excerptOf(first.text)}</p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="similar-note">Du kan fortsatt publisere spørsmålet ditt.</p>
    </>
  );

  return layout === "desktop" ? (
    <aside className="similar-questions" aria-labelledby="similar-overskrift">
      {content}
    </aside>
  ) : (
    <section className="similar-questions" aria-labelledby="similar-overskrift">
      {content}
    </section>
  );
}
