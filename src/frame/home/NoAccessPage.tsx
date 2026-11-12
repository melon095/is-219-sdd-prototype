import { Link } from "../ui/Link";
import { PageHeading } from "../ui/PageHeading";

export function NoAccessPage() {
  return (
    <>
      <PageHeading>Du har ikke tilgang til denne siden</PageHeading>
      <p>
        Siden er ikke åpen for brukeren du ser prototypen som akkurat nå. Prøv å
        bytte bruker øverst på siden, eller gå tilbake til forsiden.
      </p>
      <p>
        <Link href="/">Gå til forsiden</Link>
      </p>
    </>
  );
}
