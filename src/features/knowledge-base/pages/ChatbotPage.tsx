import { useRef, useState } from "react";
import { chatbotResponse } from "../../../domain/knowledge-base/chatbot";
import { canPost } from "../../../domain/knowledge-base/permissions";
import type { ChatbotQuestion } from "../../../domain/knowledge-base/types";
import { useDemoState } from "../../../frame/store/store";
import { useLayout } from "../../../frame/store/useLayout";
import { Button } from "../../../frame/ui/Button";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { SimulatedLabel } from "../../../frame/ui/SimulatedLabel";
import { focusAfterRender } from "../../../frame/ui/useFocusAfter";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import {
  ChatbotTranscript,
  type ChatEntry,
} from "../components/ChatbotTranscript";
import "./ChatbotPage.css";

export function ChatbotPage() {
  const state = useDemoState();
  const person = useCurrentPerson();
  const layout = useLayout();
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const counter = useRef(0);

  const choose = (question: ChatbotQuestion) => {
    counter.current += 1;
    const key = counter.current;
    const response = chatbotResponse(question, state);
    setEntries((previous) => [...previous, { key, question, response }]);
    focusAfterRender(`[data-response-key="${key}"]`);
  };

  const questions = (
    <section className="chatbot-questions" aria-labelledby="chatbot-liste">
      <h2 id="chatbot-liste">Ferdige spørsmål</h2>
      <ul className="chatbot-question-list">
        {state.knowledgeBase.chatbotQuestions.map((question) => (
          <li key={question.id}>
            <Button variant="secondary" onPress={() => choose(question)}>
              {question.text}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
  const transcript = (
    <ChatbotTranscript entries={entries} canAsk={canPost(person, state)} />
  );

  return (
    <>
      <PageHeading>Spør chatboten</PageHeading>
      <div className="chatbot-intro">
        <SimulatedLabel />
        <p>
          I den ekte tjenesten kan du skrive spørsmålet ditt med egne ord. I
          denne prototypen velger du blant noen ferdige spørsmål.
        </p>
      </div>
      <div className="chatbot-columns" data-layout={layout}>
        {layout === "desktop" ? (
          <>
            {questions}
            {transcript}
          </>
        ) : (
          <>
            {transcript}
            {questions}
          </>
        )}
      </div>
    </>
  );
}
