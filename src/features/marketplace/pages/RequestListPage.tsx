import { useState } from "react";
import { useNavigate } from "react-router";
import { isAdmin, ownedBusiness } from "../../../domain/frame/people";
import { liveEntry } from "../../../domain/marketplace/helpers";
import { statusLabel } from "../../../domain/marketplace/log";
import { canPublishRequest } from "../../../domain/marketplace/permissions";
import type {
  RequestStatus,
  TaskRequest,
} from "../../../domain/marketplace/types";
import {
  isActiveWorker,
  visibleRequests,
} from "../../../domain/marketplace/visibility";
import { useDemoState } from "../../../frame/store/store";
import { useLayout } from "../../../frame/store/useLayout";
import { Button } from "../../../frame/ui/Button";
import { Card } from "../../../frame/ui/Card";
import { Disclosure } from "../../../frame/ui/Disclosure";
import { EmptyState } from "../../../frame/ui/EmptyState";
import { Link } from "../../../frame/ui/Link";
import { Notice } from "../../../frame/ui/Notice";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { Select, SelectItem } from "../../../frame/ui/Select";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { RequestStatusBadge } from "../components/RequestStatusBadge";
import { SkillTags } from "../components/SkillTags";
import { formatDate, formatDuration } from "../format";
import "./RequestListPage.css";

const statuses: RequestStatus[] = [
  "open",
  "shortlisted",
  "offered",
  "agreed",
  "in-progress",
  "completed",
  "cancelled",
  "under-review",
];

function newestFirst(a: TaskRequest, b: TaskRequest): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

function adminOrder(a: TaskRequest, b: TaskRequest): number {
  const reviewA = a.status === "under-review" ? 0 : 1;
  const reviewB = b.status === "under-review" ? 0 : 1;
  return reviewA - reviewB || newestFirst(a, b);
}

function RequestTable({
  requests,
  labelledBy,
}: {
  requests: TaskRequest[];
  labelledBy?: string;
}) {
  const state = useDemoState();

  return (
    <table className="request-table" aria-labelledby={labelledBy}>
      <thead>
        <tr>
          <th scope="col">Oppdrag</th>
          <th scope="col">Bedrift</th>
          <th scope="col">Status</th>
          <th scope="col">Ønsket start</th>
          <th scope="col">Varighet</th>
          <th scope="col">Ferdigheter</th>
        </tr>
      </thead>
      <tbody>
        {requests.map((request) => (
          <tr key={request.id}>
            <td>
              <Link href={`/oppdrag/${request.id}`}>{request.title}</Link>
            </td>
            <td>
              {
                state.frame.businesses.find(
                  (business) => business.id === request.businessId,
                )?.name
              }
            </td>
            <td>
              <RequestStatusBadge status={request.status} />
            </td>
            <td>{formatDate(request.desiredStartDate)}</td>
            <td>{formatDuration(request.estimatedDuration)}</td>
            <td>
              <SkillTags skillIds={request.requiredSkillIds} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RequestCards({
  requests,
  labelledBy,
  headingLevel = 2,
}: {
  requests: TaskRequest[];
  labelledBy?: string;
  headingLevel?: 2 | 3;
}) {
  const state = useDemoState();

  return (
    <ul className="request-cards" aria-labelledby={labelledBy}>
      {requests.map((request) => (
        <li key={request.id}>
          <Card
            heading={request.title}
            headingLevel={headingLevel}
            action={
              <Link
                href={`/oppdrag/${request.id}`}
                aria-label={`Se oppdraget ${request.title}`}
              >
                Se oppdraget
              </Link>
            }
          >
            <div className="request-card-body">
              <p>
                {
                  state.frame.businesses.find(
                    (business) => business.id === request.businessId,
                  )?.name
                }
              </p>
              <RequestStatusBadge status={request.status} />
              <p>
                Ønsket start: {formatDate(request.desiredStartDate)}
                <br />
                Varighet: {formatDuration(request.estimatedDuration)}
              </p>
              <SkillTags skillIds={request.requiredSkillIds} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function WorkerSection({
  id,
  title,
  empty,
  requests,
  layout,
}: {
  id: string;
  title: string;
  empty: string;
  requests: TaskRequest[];
  layout: "desktop" | "mobile";
}) {
  return (
    <section className="request-list-section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {requests.length === 0 ? (
        <p>{empty}</p>
      ) : layout === "desktop" ? (
        <RequestTable requests={requests} labelledBy={id} />
      ) : (
        <RequestCards requests={requests} labelledBy={id} headingLevel={3} />
      )}
    </section>
  );
}

export function RequestListPage() {
  const state = useDemoState();
  const person = useCurrentPerson();
  const layout = useLayout();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");

  const ownBusiness = ownedBusiness(person.id, state);
  const isOwner = ownBusiness !== undefined;
  const canPublish =
    ownBusiness !== undefined &&
    canPublishRequest(person, ownBusiness.id, state);
  const admin = isAdmin(person);
  const worker = isActiveWorker(person, state);

  if (!isOwner && !admin && !worker) {
    return (
      <>
        <PageHeading>Oppdrag</PageHeading>
        <p>Denne delen er for bedriftseiere og folk som søker oppdrag.</p>
      </>
    );
  }

  const all = visibleRequests(person, state);

  if (worker && !isOwner && !admin) {
    const mine = all.filter(
      (request) =>
        liveEntry(request, person.id) !== undefined ||
        request.agreement?.workerId === person.id,
    );
    const open = all.filter(
      (request) => request.status === "open" && !mine.includes(request),
    );
    return (
      <>
        <PageHeading>Oppdrag</PageHeading>
        <Notice tone="info">
          Du kan ikke søke direkte; vi matcher deg automatisk
        </Notice>
        <WorkerSection
          id="apne-oppdrag"
          title="Åpne oppdrag"
          empty="Det er ingen åpne oppdrag akkurat nå."
          requests={[...open].sort(newestFirst)}
          layout={layout}
        />
        <WorkerSection
          id="dine-oppdrag"
          title="Dine oppdrag"
          empty="Du står ikke på noen kortlister ennå."
          requests={[...mine].sort(newestFirst)}
          layout={layout}
        />
      </>
    );
  }

  const filtered =
    admin && filter !== "all"
      ? all.filter((request) => request.status === filter)
      : all;
  const requests = [...filtered].sort(admin ? adminOrder : newestFirst);

  const filterField = (
    <Select
      label="Vis status"
      selectedKey={filter}
      onSelectionChange={(key) => setFilter(String(key))}
    >
      <SelectItem id="all">Alle statuser</SelectItem>
      {statuses.map((status) => (
        <SelectItem key={status} id={status}>
          {statusLabel(status)}
        </SelectItem>
      ))}
    </Select>
  );

  return (
    <>
      <PageHeading>Oppdrag</PageHeading>
      <div className="request-list-toolbar">
        {canPublish && (
          <Button onPress={() => navigate("/oppdrag/ny")}>Nytt oppdrag</Button>
        )}
        {admin && layout === "desktop" && filterField}
        {admin && layout === "mobile" && (
          <Disclosure title="Filtrer oppdrag">{filterField}</Disclosure>
        )}
      </div>
      {requests.length === 0 ? (
        <EmptyState title="Ingen oppdrag å vise">
          <p>
            {isOwner
              ? "Når du publiserer et oppdrag, dukker det opp her."
              : "Her dukker oppdrag opp så snart de finnes."}
          </p>
        </EmptyState>
      ) : layout === "desktop" ? (
        <RequestTable requests={requests} />
      ) : (
        <RequestCards requests={requests} />
      )}
    </>
  );
}
