import { addActivity, fail, readText, succeed } from "../frame/commandHelpers";
import { personById } from "../frame/people";
import type { CommandHandler } from "../frame/types";
import { appendLog, findRequest, replaceRequest } from "./helpers";
import { messageActivity, messageSentLog } from "./log";
import type { SendMessageInput } from "./types";
import { canSendMessage } from "./visibility";

export const sendMessage: CommandHandler = (state, command, context) => {
  const input = command as unknown as SendMessageInput;
  const conversation = state.marketplace.conversations.find(
    (item) => item.id === input.conversationId,
  );
  if (conversation === undefined) {
    return fail("not-found", "Vi finner ikke samtalen.");
  }
  const request = findRequest(state, conversation.requestId);
  if (request === undefined) {
    return fail("not-found", "Vi finner ikke oppdraget.");
  }
  const author = personById(context.actorId, state);
  if (
    author === undefined ||
    (author.id !== conversation.ownerId && author.id !== conversation.workerId)
  ) {
    return fail(
      "not-allowed",
      "Bare de to i samtalen kan skrive meldinger her.",
    );
  }
  if (!canSendMessage(author, conversation, request)) {
    return fail(
      "invalid-status",
      "Du kan ikke sende flere meldinger i denne samtalen.",
    );
  }
  const text = readText(input.text);
  if (text.length < 1 || text.length > 2000) {
    return fail("validation", "Skriv en melding på 1–2000 tegn.", {
      text: "Skriv en melding på 1–2000 tegn.",
    });
  }
  const recipientId =
    author.id === conversation.ownerId
      ? conversation.workerId
      : conversation.ownerId;
  const message = {
    id: context.newId(),
    at: context.now,
    authorId: author.id,
    text,
  };
  const updatedRequest = appendLog(request, [
    messageSentLog(
      state,
      context,
      author.id,
      recipientId,
      conversation.workerId,
    ),
  ]);
  const withMessage = {
    ...state,
    marketplace: {
      ...state.marketplace,
      conversations: state.marketplace.conversations.map((item) =>
        item.id === conversation.id
          ? { ...item, messages: [...item.messages, message] }
          : item,
      ),
    },
  };
  const next = addActivity(replaceRequest(withMessage, updatedRequest), [
    messageActivity(state, context, author.id, updatedRequest, recipientId),
  ]);
  return succeed(next);
};
