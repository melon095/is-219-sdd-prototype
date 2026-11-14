import type {
  ChatbotQuestion,
  ChatbotResponse,
} from "../../../domain/knowledge-base/types";
import { Link } from "../../../frame/ui/Link";
import { Notice } from "../../../frame/ui/Notice";
import { SimulatedLabel } from "../../../frame/ui/SimulatedLabel";
import "./ChatbotTranscript.css";

export type ChatEntry = {
  key: number;
  question: ChatbotQuestion;
  response: ChatbotResponse;
};

type TranscriptProps = {
  entries: ChatEntry[];
  canAsk: boolean;
};

function ResponseBody({
  entry,
  canAsk,
}: {
  entry: ChatEntry;
  canAsk: boolean;
}) {
  const { response, question, key } = entry;

  if (response.kind === "answer") {
    return (
      <>
        <p className="chat-text">{response.text}</p>
        <p id={`chat-kilder-${key}`} className="chat-label">
          Kilder:
        </p>
        <ul className="chat-links" aria-labelledby={`chat-kilder-${key}`}>
          {response.sources.map((source) => (
            <li key={source.id}>
              <Link href={`/kunnskapsbank/sporsmal/${source.id}`}>
                {source.title}
              </Link>
            </li>
          ))}
        </ul>
        <Notice tone="info">
          Svaret er laget av en chatbot og kan ta feil. Sjekk kildene før du
          stoler på det.
        </Notice>
      </>
    );
  }

  return (
    <>
      <p className="chat-text">Vi fant ikke noe svar på dette i forumet.</p>
      {response.closest.length > 0 && (
        <>
          <p id={`chat-lignende-${key}`} className="chat-label">
            Disse spørsmålene ligner kanskje:
          </p>
          <ul className="chat-links" aria-labelledby={`chat-lignende-${key}`}>
            {response.closest.map((close) => (
              <li key={close.id}>
                <Link href={`/kunnskapsbank/sporsmal/${close.id}`}>
                  {close.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {canAsk && (
        <p className="chat-text">
          <Link href={`/kunnskapsbank/sporsmal/ny?fra=${question.id}`}>
            Still spørsmålet i forumet
          </Link>
        </p>
      )}
    </>
  );
}

export function ChatbotTranscript({ entries, canAsk }: TranscriptProps) {
  return (
    <section className="chat-transcript" aria-labelledby="chat-overskrift">
      <h2 id="chat-overskrift">Samtalen</h2>
      <div role="log" aria-label="Samtalen med chatboten" className="chat-log">
        {entries.length === 0 ? (
          <p className="chat-empty">
            Velg et spørsmål, så dukker svaret opp her.
          </p>
        ) : (
          <ol className="chat-entries">
            {entries.map((entry) => (
              <li
                key={entry.key}
                className="chat-entry"
                data-chatbot-id={entry.question.id}
              >
                <p className="chat-question">
                  <span className="visually-hidden">Du spurte: </span>
                  {entry.question.text}
                </p>
                <div
                  className="chat-response"
                  data-response-key={entry.key}
                  tabIndex={-1}
                >
                  <p className="chat-from">
                    <SimulatedLabel />
                    <span>Chatboten svarer</span>
                  </p>
                  <ResponseBody entry={entry} canAsk={canAsk} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
