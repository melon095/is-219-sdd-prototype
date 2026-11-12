import { type CalendarDate, parseDate } from "@internationalized/date";
import { type FormEvent, useState } from "react";
import type { Key } from "react-aria-components";
import { useNavigate, useParams } from "react-router";
import { ownedBusiness } from "../../../domain/frame/people";
import type { Id } from "../../../domain/frame/types";
import { workLocationLabel } from "../../../domain/marketplace/log";
import {
  canEditRequest,
  canPublishRequest,
  isRequestOwner,
} from "../../../domain/marketplace/permissions";
import { durationNotice } from "../../../domain/marketplace/requests";
import type {
  DurationUnit,
  TaskRequest,
  WorkLocation,
} from "../../../domain/marketplace/types";
import { NotFoundPage } from "../../../frame/home/NotFoundPage";
import { RequireAccess } from "../../../frame/layout/RequireAccess";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { useLayout } from "../../../frame/store/useLayout";
import { Button } from "../../../frame/ui/Button";
import { DatePicker } from "../../../frame/ui/DatePicker";
import { Disclosure } from "../../../frame/ui/Disclosure";
import { Link } from "../../../frame/ui/Link";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { NumberField } from "../../../frame/ui/NumberField";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { Radio, RadioGroup } from "../../../frame/ui/RadioGroup";
import { Select, SelectItem } from "../../../frame/ui/Select";
import { SimulatedLabel } from "../../../frame/ui/SimulatedLabel";
import { TagPicker } from "../../../frame/ui/TagPicker";
import { TextArea } from "../../../frame/ui/TextArea";
import { TextField } from "../../../frame/ui/TextField";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import "./RequestFormPage.css";

const explanationTitle = "Slik finner vi folk til deg";

function Explanation() {
  return (
    <div className="request-form-explanation">
      <p>
        Du forteller oss hva du trenger hjelp til og hvilke ferdigheter som
        trengs.
      </p>
      <p>
        Vi finner opptil tre personer som har minst halvparten av ferdighetene
        og kan starte i tide, og legger dem på en kortliste.
      </p>
      <p>
        Du bestemmer selv hvem du vil snakke med, og hvem du vil jobbe sammen
        med.
      </p>
    </div>
  );
}

type FormProps = {
  businessId: Id;
  request?: TaskRequest;
  suggestions?: Id[];
};

function RequestForm({ businessId, request, suggestions = [] }: FormProps) {
  const state = useDemoState();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const navigate = useNavigate();
  const layout = useLayout();

  const [title, setTitle] = useState(request?.title ?? "");
  const [description, setDescription] = useState(request?.description ?? "");
  const [skillIds, setSkillIds] = useState<string[]>(
    request?.requiredSkillIds ?? suggestions,
  );
  const [dropped, setDropped] = useState<Id[]>([]);
  const [additional, setAdditional] = useState(
    request?.additionalRequirements ?? "",
  );
  const [startDate, setStartDate] = useState<CalendarDate | null>(
    request === undefined ? null : parseDate(request.desiredStartDate),
  );
  const [amount, setAmount] = useState(
    request?.estimatedDuration.amount ?? Number.NaN,
  );
  const [unit, setUnit] = useState<DurationUnit>(
    request?.estimatedDuration.unit ?? "weeks",
  );
  const [hours, setHours] = useState(request?.hoursPerWeek ?? Number.NaN);
  const [location, setLocation] = useState<string | null>(
    request?.workLocation ?? null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const notice = durationNotice({ amount, unit });
  const markedIds = (request?.acceptedSuggestionIds ?? suggestions).filter(
    (id) => !dropped.includes(id),
  );
  const changeSkills = (keys: Key[]) => {
    const next = keys.map(String);
    const removed = markedIds.filter((id) => !next.includes(id));
    if (removed.length > 0) {
      setDropped([...dropped, ...removed]);
    }
    setSkillIds(next);
  };
  const showSuggestionNote = request === undefined && suggestions.length > 0;

  const skillItems = state.frame.skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
  }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const fields = {
      title,
      description,
      requiredSkillIds: skillIds,
      acceptedSuggestionIds: markedIds.filter((id) => skillIds.includes(id)),
      additionalRequirements: additional,
      desiredStartDate: startDate?.toString(),
      estimatedDuration: { amount, unit },
      hoursPerWeek: hours,
      workLocation: location ?? undefined,
    };
    const result =
      request === undefined
        ? dispatch({ type: "publishRequest", businessId, ...fields })
        : dispatch({ type: "editRequest", requestId: request.id, ...fields });
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setFormError(result.error.message);
      return;
    }
    setErrors({});
    setFormError(undefined);
    if (request === undefined) {
      const created = result.state.marketplace.requests.at(-1);
      announce("Oppdraget er publisert");
      navigate(`/oppdrag/${created?.id ?? ""}`);
    } else {
      announce("Endringene er lagret");
      navigate(`/oppdrag/${request.id}`);
    }
  };

  const form = (
    <form className="request-form" onSubmit={submit} noValidate>
      {formError !== undefined && <Notice tone="error">{formError}</Notice>}
      <TextField
        label="Tittel"
        value={title}
        onChange={setTitle}
        isInvalid={errors.title !== undefined}
        errorMessage={errors.title}
      />
      <TextArea
        label="Beskrivelse"
        rows={6}
        value={description}
        onChange={setDescription}
        isInvalid={errors.description !== undefined}
        errorMessage={errors.description}
      />
      <TagPicker
        label="Nødvendige ferdigheter"
        items={skillItems}
        selectedKeys={skillIds}
        onSelectionChange={changeSkills}
        markedKeys={markedIds}
        markLabel="Forslag"
        errorMessage={errors.requiredSkillIds}
      />
      {showSuggestionNote && (
        <p className="request-form-suggestion-note">
          Foreslått fra en simulert gjennomgang av nettsiden deres{" "}
          <SimulatedLabel />
        </p>
      )}
      <TextArea
        label="Tilleggskrav (valgfritt)"
        value={additional}
        onChange={setAdditional}
      />
      <DatePicker
        label="Ønsket startdato"
        value={startDate}
        onChange={setStartDate}
        isInvalid={errors.desiredStartDate !== undefined}
        errorMessage={errors.desiredStartDate}
      />
      <div className="request-form-duration">
        <NumberField
          label="Varighet"
          value={amount}
          onChange={setAmount}
          isInvalid={errors.estimatedDuration !== undefined}
          errorMessage={errors.estimatedDuration}
        />
        <Select
          label="Enhet"
          selectedKey={unit}
          onSelectionChange={(key) => setUnit(key as DurationUnit)}
        >
          <SelectItem id="weeks">uker</SelectItem>
          <SelectItem id="months">måneder</SelectItem>
        </Select>
      </div>
      {notice !== undefined && <Notice tone="warning">{notice.message}</Notice>}
      <NumberField
        label="Timer per uke"
        value={hours}
        onChange={setHours}
        isInvalid={errors.hoursPerWeek !== undefined}
        errorMessage={errors.hoursPerWeek}
      />
      <RadioGroup
        label="Sted for arbeidet"
        value={location}
        onChange={setLocation}
        isInvalid={errors.workLocation !== undefined}
        errorMessage={errors.workLocation}
      >
        {(["remote", "onsite"] satisfies WorkLocation[]).map((item) => (
          <Radio key={item} value={item}>
            {workLocationLabel(item)}
          </Radio>
        ))}
      </RadioGroup>
      <div className="request-form-actions">
        <Button type="submit">
          {request === undefined ? "Publiser oppdraget" : "Lagre endringer"}
        </Button>
      </div>
    </form>
  );

  if (layout === "mobile") {
    return (
      <div className="request-form-layout" data-layout="mobile">
        <Disclosure title={explanationTitle}>
          <Explanation />
        </Disclosure>
        {form}
      </div>
    );
  }

  return (
    <div className="request-form-layout" data-layout="desktop">
      {form}
      <aside className="request-form-aside">
        <h2>{explanationTitle}</h2>
        <Explanation />
      </aside>
    </div>
  );
}

function NewRequestPage() {
  const state = useDemoState();
  const person = useCurrentPerson();
  const business = ownedBusiness(person.id, state);

  return (
    <RequireAccess
      allowed={(candidate, current) => {
        const owned = ownedBusiness(candidate.id, current);
        return (
          owned !== undefined && canPublishRequest(candidate, owned.id, current)
        );
      }}
    >
      <PageHeading>Nytt oppdrag</PageHeading>
      {business !== undefined && (
        <RequestForm
          key={business.id}
          businessId={business.id}
          suggestions={business.crawlSuggestions}
        />
      )}
    </RequireAccess>
  );
}

function EditRequestPage({ requestId }: { requestId: Id }) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const request = state.marketplace.requests.find(
    (item) => item.id === requestId,
  );
  const business = state.frame.businesses.find(
    (item) => item.id === request?.businessId,
  );

  if (request === undefined || business === undefined) {
    return <NotFoundPage />;
  }

  return (
    <RequireAccess
      allowed={(person, current) => isRequestOwner(person, request, current)}
    >
      <PageHeading>Rediger oppdrag</PageHeading>
      {canEditRequest(person, request, state) ? (
        <RequestForm
          key={request.id}
          businessId={business.id}
          request={request}
        />
      ) : (
        <div className="request-form-closed">
          <p>Oppdraget kan bare endres mens det er åpent</p>
          <Link href={`/oppdrag/${request.id}`}>Tilbake til oppdraget</Link>
        </div>
      )}
    </RequireAccess>
  );
}

export function RequestFormPage() {
  const { requestId } = useParams();

  if (requestId === undefined) {
    return <NewRequestPage />;
  }
  return <EditRequestPage requestId={requestId} />;
}
