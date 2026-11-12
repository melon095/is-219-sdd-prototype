import { useId, useState } from "react";
import { isAdmin } from "../../../domain/frame/people";
import { personName } from "../../../domain/marketplace/log";
import type {
  Conversation,
  TaskRequest,
} from "../../../domain/marketplace/types";
import {
  canSeeConversation,
  canSendMessage,
} from "../../../domain/marketplace/visibility";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { Button } from "../../../frame/ui/Button";
import { EmptyState } from "../../../frame/ui/EmptyState";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { Tab, TabList, TabPanel, Tabs } from "../../../frame/ui/Tabs";
import { TextArea } from "../../../frame/ui/TextArea";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { formatDateTime } from "../format";
import "./ConversationPanel.css";

function ConversationView({
  conversation,
  request,
}: {
  conversation: Conversation;
  request: TaskRequest;
}) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  const canSend = canSendMessage(person, conversation, request);

  const send = () => {
    const result = dispatch({
      type: "sendMessage",
      conversationId: conversation.id,
      text,
    });
    if (result.ok) {
      setText("");
      setError(undefined);
      announce("Meldingen er sendt");
    } else {
      setError(result.error.fieldErrors?.text ?? result.error.message);
    }
  };

  return (
    <div className="conversation-view">
      {conversation.messages.length === 0 ? (
        <p className="conversation-empty">Ingen meldinger ennå.</p>
      ) : (
        <ol
          className="conversation-messages"
          aria-label="Meldingene i samtalen"
        >
          {conversation.messages.map((message) => (
            <li key={message.id} className="conversation-message">
              <p className="conversation-message-meta">
                <strong>{personName(state, message.authorId)}</strong>
                <time dateTime={message.at}>{formatDateTime(message.at)}</time>
              </p>
              <p className="conversation-message-text">{message.text}</p>
            </li>
          ))}
        </ol>
      )}
      {canSend && (
        <div className="conversation-form">
          <TextArea
            label="Skriv en melding"
            value={text}
            onChange={setText}
            isInvalid={error !== undefined}
            errorMessage={error}
          />
          <Button onPress={send}>Send</Button>
        </div>
      )}
      {!canSend && isAdmin(person) && (
        <Notice tone="info">
          Du kan lese, men ikke skrive i denne samtalen
        </Notice>
      )}
      {!canSend && !isAdmin(person) && (
        <Notice tone="info">
          Du kan ikke sende flere meldinger i denne samtalen.
        </Notice>
      )}
    </div>
  );
}

export function ConversationPanel({
  request,
  hideHeading = false,
}: {
  request: TaskRequest;
  hideHeading?: boolean;
}) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const headingId = useId();

  const conversations = state.marketplace.conversations.filter(
    (item) => item.requestId === request.id && canSeeConversation(person, item),
  );

  const tabLabel = (conversation: Conversation) => {
    if (isAdmin(person)) {
      return `${personName(state, conversation.ownerId)} og ${personName(state, conversation.workerId)}`;
    }
    return person.id === conversation.ownerId
      ? personName(state, conversation.workerId)
      : personName(state, conversation.ownerId);
  };

  return (
    <section className="conversation-panel" aria-labelledby={headingId}>
      <h2
        id={headingId}
        className={hideHeading ? "visually-hidden" : undefined}
      >
        Meldinger
      </h2>
      {conversations.length === 0 ? (
        <EmptyState title="Ingen samtaler ennå">
          <p>Samtalene dukker opp her når noen er på kortlisten.</p>
        </EmptyState>
      ) : (
        <Tabs>
          <TabList aria-label="Samtaler">
            {conversations.map((conversation) => (
              <Tab key={conversation.id} id={conversation.id}>
                {tabLabel(conversation)}
              </Tab>
            ))}
          </TabList>
          {conversations.map((conversation) => (
            <TabPanel key={conversation.id} id={conversation.id}>
              <ConversationView conversation={conversation} request={request} />
            </TabPanel>
          ))}
        </Tabs>
      )}
    </section>
  );
}
