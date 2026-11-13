import { Link } from "../../../frame/ui/Link";
import { PageHeading } from "../../../frame/ui/PageHeading";

export function MembersOnlyPage() {
  return (
    <>
      <PageHeading>Kunnskapsbanken er for E-Waves-medlemmer</PageHeading>
      <p>
        Kunnskapsbanken er et medlemsgode for bedrifter i E-Waves, et nettverk
        av nettbutikker. Her hjelper bedriftene hverandre med spørsmål og svar.
      </p>
      <p>
        <Link href="/">Gå til forsiden</Link>
      </p>
    </>
  );
}
