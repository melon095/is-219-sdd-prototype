import type { TaskRequest } from "../../../domain/marketplace/types";
import { Link } from "../../../frame/ui/Link";
import { PageHeading } from "../../../frame/ui/PageHeading";

export function RequestNoLongerOpen({ request }: { request: TaskRequest }) {
  return (
    <>
      <PageHeading>{request.title}</PageHeading>
      <p>
        Dette oppdraget er ikke lenger åpent for deg. Vi gir deg beskjed når vi
        finner nye oppdrag som passer deg.
      </p>
      <Link href="/oppdrag">Se oppdrag</Link>
    </>
  );
}
