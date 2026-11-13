import { type CalendarDate, parseDate } from "@internationalized/date";
import { type FormEvent, useState } from "react";
import { workerProfileOf } from "../../../domain/frame/people";
import { experienceLabel, statusLabel } from "../../../domain/marketplace/log";
import {
  canRegisterWorkerProfile,
  canUpdateWorkerProfile,
} from "../../../domain/marketplace/permissions";
import type {
  ExperienceLevel,
  TaskRequest,
  WorkerProfile,
} from "../../../domain/marketplace/types";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { Button } from "../../../frame/ui/Button";
import { DatePicker } from "../../../frame/ui/DatePicker";
import { Link } from "../../../frame/ui/Link";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { Radio, RadioGroup } from "../../../frame/ui/RadioGroup";
import { SimulatedLabel } from "../../../frame/ui/SimulatedLabel";
import { StatusBadge } from "../../../frame/ui/StatusBadge";
import { TagPicker } from "../../../frame/ui/TagPicker";
import { TextArea } from "../../../frame/ui/TextArea";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { SkillTags } from "../components/SkillTags";
import { formatDate } from "../format";
import "./WorkerProfilePage.css";

const levels: ExperienceLevel[] = ["junior", "mid", "senior"];

type FormProps = {
  profile: WorkerProfile | undefined;
  mode: "register" | "edit";
  onDone: () => void;
};

function ProfileForm({ profile, mode, onDone }: FormProps) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const dispatch = useDispatch();
  const announce = useAnnounce();

  const [skillIds, setSkillIds] = useState<string[]>(profile?.skillIds ?? []);
  const [level, setLevel] = useState<string | null>(
    profile?.experienceLevel ?? null,
  );
  const [availableFrom, setAvailableFrom] = useState<CalendarDate | null>(
    profile?.availableFrom === undefined
      ? null
      : parseDate(profile.availableFrom),
  );
  const [wishes, setWishes] = useState(profile?.wishes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const skillItems = state.frame.skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
  }));
  const allowed =
    mode === "register"
      ? canRegisterWorkerProfile(person, state)
      : canUpdateWorkerProfile(person, state);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = dispatch({
      type:
        mode === "register" ? "registerWorkerProfile" : "updateWorkerProfile",
      skillIds,
      experienceLevel: level ?? undefined,
      availableFrom: availableFrom?.toString(),
      wishes,
    });
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setFormError(result.error.message);
      return;
    }
    setErrors({});
    setFormError(undefined);
    announce(
      mode === "register" ? "Profilen din er klar" : "Endringene er lagret",
    );
    onDone();
  };

  return (
    <form className="worker-profile-form" onSubmit={submit} noValidate>
      {formError !== undefined && <Notice tone="error">{formError}</Notice>}
      <TagPicker
        label="Ferdigheter"
        items={skillItems}
        selectedKeys={skillIds}
        onSelectionChange={(keys) => setSkillIds(keys.map(String))}
        errorMessage={errors.skillIds}
      />
      <RadioGroup
        label="Erfaringsnivå"
        value={level}
        onChange={setLevel}
        isInvalid={errors.experienceLevel !== undefined}
        errorMessage={errors.experienceLevel}
      >
        {levels.map((item) => (
          <Radio key={item} value={item}>
            {experienceLabel(item)}
          </Radio>
        ))}
      </RadioGroup>
      <DatePicker
        label="Tilgjengelig fra"
        value={availableFrom}
        onChange={setAvailableFrom}
        isInvalid={errors.availableFrom !== undefined}
        errorMessage={errors.availableFrom}
      />
      <TextArea
        label="Ønsker (valgfritt)"
        description="Fortell hva du helst vil jobbe med."
        rows={4}
        value={wishes}
        onChange={setWishes}
      />
      <div className="worker-profile-actions">
        <Button type="submit" isDisabled={!allowed}>
          {mode === "register" ? "Registrer profilen" : "Lagre endringer"}
        </Button>
        {mode === "edit" && (
          <Button variant="quiet" onPress={onDone}>
            Avbryt
          </Button>
        )}
      </div>
    </form>
  );
}

function involvement(request: TaskRequest, personId: string): string {
  if (request.agreement?.workerId === personId) {
    return statusLabel(request.status);
  }
  if (request.status === "offered" && request.offeredWorkerId === personId) {
    return "Du har fått et tilbud";
  }
  return "På kortlisten";
}

function Involvements({ personId }: { personId: string }) {
  const state = useDemoState();
  const requests = state.marketplace.requests.filter(
    (request) =>
      request.agreement?.workerId === personId ||
      request.shortlist.some(
        (entry) => entry.workerId === personId && entry.state !== "removed",
      ),
  );

  return (
    <section
      className="worker-profile-section"
      aria-labelledby="kortlister-overskrift"
    >
      <h2 id="kortlister-overskrift">Kortlister og tilbud</h2>
      {requests.length === 0 ? (
        <p>Du står ikke på noen kortlister ennå.</p>
      ) : (
        <ul
          className="worker-profile-requests"
          aria-labelledby="kortlister-overskrift"
        >
          {requests.map((request) => (
            <li key={request.id}>
              <Link href={`/oppdrag/${request.id}`}>{request.title}</Link>
              <span className="worker-profile-involvement">
                {involvement(request, personId)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProfileView({
  profile,
  onEdit,
}: {
  profile: WorkerProfile;
  onEdit: () => void;
}) {
  return (
    <>
      <section
        className="worker-profile-section"
        aria-labelledby="profil-overskrift"
      >
        <h2 id="profil-overskrift">Din profil</h2>
        {profile.navReferral !== undefined && (
          <div>
            <StatusBadge label="Henvist fra NAV" tone="info" />
          </div>
        )}
        <dl className="worker-profile-facts">
          <div>
            <dt>Ferdigheter</dt>
            <dd>
              <SkillTags skillIds={profile.skillIds} />
            </dd>
          </div>
          {profile.experienceLevel !== undefined && (
            <div>
              <dt>Erfaringsnivå</dt>
              <dd>{experienceLabel(profile.experienceLevel)}</dd>
            </div>
          )}
          {profile.availableFrom !== undefined && (
            <div>
              <dt>Tilgjengelig fra</dt>
              <dd>{formatDate(profile.availableFrom)}</dd>
            </div>
          )}
          {profile.wishes !== undefined && (
            <div>
              <dt>Ønsker</dt>
              <dd>{profile.wishes}</dd>
            </div>
          )}
        </dl>
        <div className="worker-profile-actions">
          <Button variant="secondary" onPress={onEdit}>
            Rediger
          </Button>
        </div>
      </section>
      <Involvements personId={profile.personId} />
    </>
  );
}

export function WorkerProfilePage() {
  const state = useDemoState();
  const person = useCurrentPerson();
  const [editing, setEditing] = useState(false);

  if (!person.seeksWork) {
    return (
      <>
        <PageHeading>Min profil</PageHeading>
        <p>Denne siden er for deg som søker oppdrag.</p>
      </>
    );
  }

  const profile = workerProfileOf(person.id, state);
  const isComplete = profile !== undefined && !profile.isDraft;

  return (
    <>
      <PageHeading>Min profil</PageHeading>
      {profile?.isDraft === true && profile.navReferral !== undefined && (
        <Notice tone="info">
          <p className="worker-profile-nav-notice">
            Du er henvist fra NAV (simulert). Fyll ut profilen din for å bli med
            i matchingen <SimulatedLabel />
          </p>
        </Notice>
      )}
      {!isComplete && (
        <ProfileForm
          key={person.id}
          profile={profile}
          mode="register"
          onDone={() => setEditing(false)}
        />
      )}
      {isComplete && editing && (
        <ProfileForm
          key={`${person.id}-edit`}
          profile={profile}
          mode="edit"
          onDone={() => setEditing(false)}
        />
      )}
      {isComplete && !editing && (
        <ProfileView profile={profile} onEdit={() => setEditing(true)} />
      )}
    </>
  );
}
