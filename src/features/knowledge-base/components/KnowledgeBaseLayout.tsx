import { canReview, canView } from "../../../domain/knowledge-base/permissions";
import { type SubNavItem, SubNavLayout } from "../../../frame/layout/SubNav";
import { useDemoState } from "../../../frame/store/store";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { MembersOnlyPage } from "../pages/MembersOnlyPage";

const label = "I Kunnskapsbank";

function useKnowledgeBaseLinks(): SubNavItem[] {
  const state = useDemoState();
  const person = useCurrentPerson();

  const links: SubNavItem[] = [
    { label: "Forum", path: "/kunnskapsbank" },
    { label: "Spør chatboten", path: "/kunnskapsbank/chatbot" },
  ];
  if (canReview(person)) {
    const openReviews = state.knowledgeBase.reviews.filter(
      (review) => review.outcome === undefined,
    ).length;
    links.push({
      label: "Til vurdering",
      path: "/kunnskapsbank/vurdering",
      badge: String(openReviews),
    });
  }
  return links;
}

export function KnowledgeBaseLayout() {
  const state = useDemoState();
  const person = useCurrentPerson();

  if (!canView(person, state)) {
    return <MembersOnlyPage />;
  }
  return <SubNavLayout label={label} useLinks={useKnowledgeBaseLinks} />;
}
