import { useId } from "react";
import { ownedBusiness, peopleWorkingAt } from "../../../domain/frame/people";
import type { Business, DemoState, Person } from "../../../domain/frame/types";
import { canSetCrawlOptIn } from "../../../domain/marketplace/permissions";
import { RequireAccess } from "../../../frame/layout/RequireAccess";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { PageHeading } from "../../../frame/ui/PageHeading";
import { SimulatedLabel } from "../../../frame/ui/SimulatedLabel";
import { Switch } from "../../../frame/ui/Switch";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { SkillTags } from "../components/SkillTags";
import { formatDateTime } from "../format";
import "./BusinessPage.css";

const switchLabel =
  "Vi vil gjerne få forslag fra en simulert gjennomgang av nettsiden vår";

function businessFor(person: Person, state: DemoState): Business | undefined {
  return (
    ownedBusiness(person.id, state) ??
    state.frame.businesses.find((business) =>
      business.employeeIds.includes(person.id),
    )
  );
}

function People({ business }: { business: Business }) {
  const state = useDemoState();
  const people = peopleWorkingAt(business, state);

  return (
    <section className="business-section" aria-labelledby="folk-overskrift">
      <h2 id="folk-overskrift">Folk som jobber her</h2>
      <ul className="business-people">
        {people.map((person) => (
          <li key={person.id}>
            <span className="business-person-name">{person.name}</span>
            <span className="business-person-description">
              {person.description}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CrawlChoice({ business }: { business: Business }) {
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const explanationId = useId();

  const change = (optIn: boolean) => {
    const result = dispatch({
      type: "setCrawlOptIn",
      businessId: business.id,
      optIn,
    });
    if (result.ok) {
      announce(
        optIn
          ? "Du får forslag fra neste gjennomgang"
          : "Du får ikke forslag fra neste gjennomgang",
      );
    }
  };

  return (
    <section className="business-section" aria-labelledby="valg-overskrift">
      <h2 id="valg-overskrift">Forslag til ferdigheter</h2>
      <Switch
        isSelected={business.crawlOptIn}
        onChange={change}
        aria-describedby={explanationId}
      >
        {switchLabel}
      </Switch>
      <p id={explanationId} className="business-explanation">
        Når du sier ja, kan Varodd gjøre en simulert gjennomgang av nettsiden
        deres og foreslå hvilke ferdigheter dere ofte trenger hjelp med. Du får
        forslagene ferdig utfylt når du lager et nytt oppdrag, og du bestemmer
        selv hvilke du beholder. Valget gjelder fra neste gjennomgang, og
        oppdrag du allerede har laget blir aldri endret.
      </p>
    </section>
  );
}

function Suggestions({ business }: { business: Business }) {
  const hasSuggestions = business.crawlSuggestions.length > 0;

  return (
    <section className="business-section" aria-labelledby="forslag-overskrift">
      <h2 id="forslag-overskrift">Forslag fra gjennomgangen</h2>
      {hasSuggestions ? (
        <>
          <SkillTags skillIds={business.crawlSuggestions} />
          <p className="business-crawl-time">
            {business.crawlSuggestionsUpdatedAt !== undefined && (
              <>
                Siste gjennomgang:{" "}
                <time dateTime={business.crawlSuggestionsUpdatedAt}>
                  {formatDateTime(business.crawlSuggestionsUpdatedAt)}
                </time>{" "}
              </>
            )}
            <SimulatedLabel />
          </p>
        </>
      ) : (
        <p>Du har ingen forslag ennå.</p>
      )}
    </section>
  );
}

function BusinessContent() {
  const state = useDemoState();
  const person = useCurrentPerson();
  const business = businessFor(person, state);

  if (business === undefined) {
    return null;
  }
  const canChange = canSetCrawlOptIn(person, business.id, state);

  return (
    <>
      <PageHeading>Min bedrift</PageHeading>
      <h2 className="business-name">{business.name}</h2>
      {canChange && (
        <>
          <p className="business-description">{business.description}</p>
          <p className="business-membership">
            {business.isEWavesMember
              ? "Medlem av E-Waves"
              : "Ikke medlem av E-Waves"}
          </p>
        </>
      )}
      <People business={business} />
      {canChange && (
        <>
          <CrawlChoice business={business} />
          <Suggestions business={business} />
        </>
      )}
    </>
  );
}

export function BusinessPage() {
  return (
    <RequireAccess
      allowed={(person, state) => businessFor(person, state) !== undefined}
    >
      <BusinessContent />
    </RequireAccess>
  );
}
