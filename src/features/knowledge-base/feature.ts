import { createElement } from "react";
import type { FeatureDefinition, HomeCard } from "../../app/features";
import { isAdmin } from "../../domain/frame/people";
import { knowledgeBaseCommandHandlers } from "../../domain/knowledge-base/commands";
import { isMember } from "../../domain/knowledge-base/permissions";
import { PageHeading } from "../../frame/ui/PageHeading";
import { KnowledgeBaseLayout } from "./components/KnowledgeBaseLayout";
import { ForumPage } from "./pages/ForumPage";
import { QuestionFormPage } from "./pages/QuestionFormPage";
import { QuestionPage } from "./pages/QuestionPage";
import { TopicPage } from "./pages/TopicPage";
import { knowledgeBaseStateSchema } from "./schema";

const memberCard: HomeCard = {
  title: "Spør andre bedrifter",
  text: "Still et spørsmål, eller finn svar fra bedrifter som har løst det samme før deg.",
  actionLabel: "Gå til kunnskapsbanken",
  route: "/kunnskapsbank",
};

const adminCard: HomeCard = {
  title: "Kunnskapsbanken",
  text: "Se hva medlemmene spør om, og vurder innhold som er flagget.",
  actionLabel: "Gå til kunnskapsbanken",
  route: "/kunnskapsbank",
};

export const knowledgeBaseFeature: FeatureDefinition = {
  id: "knowledgeBase",
  label: "Kunnskapsbank",
  basePath: "/kunnskapsbank",
  homeCard: (person, state) => {
    if (isAdmin(person)) {
      return adminCard;
    }
    if (isMember(person, state)) {
      return memberCard;
    }
    return null;
  },
  routes: [
    {
      element: createElement(KnowledgeBaseLayout),
      children: [
        { path: "/kunnskapsbank", element: createElement(ForumPage) },
        {
          path: "/kunnskapsbank/tema/:topicId",
          element: createElement(TopicPage),
        },
        {
          path: "/kunnskapsbank/sporsmal/ny",
          element: createElement(QuestionFormPage),
        },
        {
          path: "/kunnskapsbank/sporsmal/:questionId/rediger",
          element: createElement(QuestionFormPage),
        },
        {
          path: "/kunnskapsbank/sporsmal/:questionId",
          element: createElement(QuestionPage),
        },
        {
          path: "/kunnskapsbank/chatbot",
          element: createElement(PageHeading, null, "Spør chatboten"),
        },
        {
          path: "/kunnskapsbank/vurdering",
          element: createElement(PageHeading, null, "Til vurdering"),
        },
      ],
    },
  ],
  audienceGroups: { "knowledgeBase.members": isMember },
  commandHandlers: knowledgeBaseCommandHandlers,
  stateSchema: knowledgeBaseStateSchema,
  systemSteps: [],
};
