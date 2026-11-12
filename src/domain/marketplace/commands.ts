import type { CommandHandler } from "../frame/types";
import { sendMessage } from "./messages";
import { acceptOffer, inviteToInterview, makeOffer } from "./offers";
import {
  editRequest,
  publishRequest,
  rejectShortlist,
  returnToOpen,
} from "./requests";

export const marketplaceCommandHandlers: Record<string, CommandHandler> = {
  publishRequest,
  editRequest,
  inviteToInterview,
  makeOffer,
  acceptOffer,
  rejectShortlist,
  returnToOpen,
  sendMessage,
};
