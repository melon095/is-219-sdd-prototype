import { Link } from "../ui/Link";
import { PageHeading } from "../ui/PageHeading";

export function NotFoundPage() {
  return (
    <>
      <PageHeading>Siden finnes ikke</PageHeading>
      <p>Vi finner ikke siden du leter etter. Kanskje lenken er gammel?</p>
      <p>
        <Link href="/">Gå til forsiden</Link>
      </p>
    </>
  );
}
