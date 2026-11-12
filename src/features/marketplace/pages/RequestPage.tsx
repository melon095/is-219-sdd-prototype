import { useParams } from "react-router";
import { isAdmin } from "../../../domain/frame/people";
import { ownerIdOf } from "../../../domain/marketplace/helpers";
import { workLocationLabel } from "../../../domain/marketplace/log";
import { canEditRequest } from "../../../domain/marketplace/permissions";
import { durationNotice } from "../../../domain/marketplace/requests";
import type { TaskRequest } from "../../../domain/marketplace/types";
import {
  canSeeRequest,
  canSeeRequestTitle,
} from "../../../domain/marketplace/visibility";
import { NoAccessPage } from "../../../frame/home/NoAccessPage";
import { NotFoundPage } from "../../../frame/home/NotFoundPage";
import { useDemoState } from "../../../frame/store/store";
import { useLayout } from "../../../frame/store/useLayout";
import { Link } from "../../../frame/ui/Link";
import { Notice } from "../../../frame/ui/Notice";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { Tab, TabList, TabPanel, Tabs } from "../../../frame/ui/Tabs";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { ConversationPanel } from "../components/ConversationPanel";
import { RequestLog } from "../components/RequestLog";
import { RequestNoLongerOpen } from "../components/RequestNoLongerOpen";
import { RequestStatusBadge } from "../components/RequestStatusBadge";
import { ShortlistPanel } from "../components/ShortlistPanel";
import { SkillTags } from "../components/SkillTags";
import { WorkerStatusPanel } from "../components/WorkerStatusPanel";
import { formatDate, formatDuration } from "../format";
import "./RequestPage.css";

function RequestDetails({ request }: { request: TaskRequest }) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const business = state.frame.businesses.find(
    (item) => item.id === request.businessId,
  );
  const notice = durationNotice(request.estimatedDuration);
  const isOwner = ownerIdOf(state, request) === person.id;
  const isStaff = isOwner || isAdmin(person);

  return (
    <section className="request-details" aria-labelledby="detaljer-overskrift">
      <h2 id="detaljer-overskrift">Detaljer</h2>
      <div className="request-details-status">
        <RequestStatusBadge status={request.status} />
        {canEditRequest(person, request, state) && (
          <Link href={`/oppdrag/${request.id}/rediger`}>Rediger</Link>
        )}
      </div>
      {notice !== undefined && <Notice tone="warning">{notice.message}</Notice>}
      {isStaff && request.rejection !== undefined && (
        <Notice tone="info" title="Kortlisten ble avvist">
          {request.rejection.reason}
        </Notice>
      )}
      <p className="request-details-description">{request.description}</p>
      <dl className="request-details-facts">
        <div>
          <dt>Bedrift</dt>
          <dd>{business?.name}</dd>
        </div>
        <div>
          <dt>Ønsket start</dt>
          <dd>{formatDate(request.desiredStartDate)}</dd>
        </div>
        <div>
          <dt>Varighet</dt>
          <dd>{formatDuration(request.estimatedDuration)}</dd>
        </div>
        <div>
          <dt>Timer per uke</dt>
          <dd>{request.hoursPerWeek}</dd>
        </div>
        <div>
          <dt>Sted</dt>
          <dd>{workLocationLabel(request.workLocation)}</dd>
        </div>
        <div>
          <dt>Ferdigheter</dt>
          <dd>
            <SkillTags skillIds={request.requiredSkillIds} />
          </dd>
        </div>
        {request.additionalRequirements !== undefined && (
          <div>
            <dt>Tilleggskrav</dt>
            <dd>{request.additionalRequirements}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function RequestView({ request }: { request: TaskRequest }) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const layout = useLayout();

  const isStaff = ownerIdOf(state, request) === person.id || isAdmin(person);
  const isParticipant =
    isStaff ||
    request.shortlist.some((entry) => entry.workerId === person.id) ||
    request.agreement?.workerId === person.id;

  const details = <RequestDetails request={request} />;

  if (layout === "mobile") {
    return (
      <>
        <PageHeading>{request.title}</PageHeading>
        {details}
        <WorkerStatusPanel request={request} />
        {isParticipant && (
          <Tabs className="request-page-tabs">
            <TabList aria-label="Innhold i oppdraget">
              {isStaff && <Tab id="shortlist">Kortliste</Tab>}
              <Tab id="messages">Meldinger</Tab>
              <Tab id="log">Logg</Tab>
            </TabList>
            {isStaff && (
              <TabPanel id="shortlist">
                <ShortlistPanel request={request} hideHeading />
              </TabPanel>
            )}
            <TabPanel id="messages">
              <ConversationPanel request={request} hideHeading />
            </TabPanel>
            <TabPanel id="log">
              <RequestLog request={request} hideHeading />
            </TabPanel>
          </Tabs>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeading>{request.title}</PageHeading>
      <div className="request-page-columns">
        <div className="request-page-column" data-column="main">
          {details}
          {isParticipant && <RequestLog request={request} />}
        </div>
        <div className="request-page-column" data-column="side">
          <WorkerStatusPanel request={request} />
          {isStaff && <ShortlistPanel request={request} />}
          {isParticipant && <ConversationPanel request={request} />}
        </div>
      </div>
    </>
  );
}

export function RequestPage() {
  const { requestId } = useParams();
  const state = useDemoState();
  const person = useCurrentPerson();

  const request = state.marketplace.requests.find(
    (item) => item.id === requestId,
  );
  if (request === undefined) {
    return <NotFoundPage />;
  }
  if (!canSeeRequest(person, request, state)) {
    return canSeeRequestTitle(person, request, state) ? (
      <RequestNoLongerOpen request={request} />
    ) : (
      <NoAccessPage />
    );
  }
  return <RequestView request={request} />;
}
