import {
  findTarget,
  flagsOfReview,
  openReviewFor,
} from "../../../domain/knowledge-base/helpers";
import { canSeeFlaggers } from "../../../domain/knowledge-base/permissions";
import type { ContentTarget } from "../../../domain/knowledge-base/types";
import { useDemoState } from "../../../frame/store/store";
import { Notice } from "../../../frame/ui/Notice";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { reasonLabel } from "../labels";
import { FlagList } from "./FlagList";
import "./Moderation.css";

export function FlagWarning({ target }: { target: ContentTarget }) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const item = findTarget(state, target);

  if (item === undefined || item.moderation !== "flagged") {
    return null;
  }
  const review = openReviewFor(state, target);
  const flags = review === undefined ? [] : flagsOfReview(state, review);
  const reasons = [...new Set(flags.map((flag) => reasonLabel(flag.reason)))];
  const listed = reasons.length > 0 ? ` (${reasons.join(", ")})` : "";

  return (
    <Notice tone="warning">
      <p>{`Dette innlegget er flagget${listed} og blir vurdert av Varodd. Vær forsiktig med å stole på det.`}</p>
      {canSeeFlaggers(person) && flags.length > 0 && <FlagList flags={flags} />}
    </Notice>
  );
}
