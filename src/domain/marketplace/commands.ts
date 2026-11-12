import type { CommandHandler } from "../frame/types";
import {
  cancelRequest,
  completeRequest,
  recordStart,
  withdraw,
} from "./lifecycle";
import { sendMessage } from "./messages";
import {
  acceptOffer,
  declineOffer,
  inviteToInterview,
  makeOffer,
  simulateOfferExpiry,
} from "./offers";
import {
  editRequest,
  publishRequest,
  rejectShortlist,
  returnToOpen,
} from "./requests";
import {
  registerWorkerProfile,
  simulateNavReferral,
  updateWorkerProfile,
} from "./workers";

export const marketplaceCommandHandlers: Record<string, CommandHandler> = {
  publishRequest,
  editRequest,
  inviteToInterview,
  makeOffer,
  acceptOffer,
  declineOffer,
  simulateOfferExpiry,
  rejectShortlist,
  returnToOpen,
  sendMessage,
  recordStart,
  withdraw,
  completeRequest,
  cancelRequest,
  registerWorkerProfile,
  updateWorkerProfile,
  simulateNavReferral,
};
