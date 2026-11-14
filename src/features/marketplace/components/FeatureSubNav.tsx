import { isAdmin, ownedBusiness } from "../../../domain/frame/people";
import {
  SubNav,
  type SubNavItem,
  SubNavLayout,
} from "../../../frame/layout/SubNav";
import { useDemoState } from "../../../frame/store/store";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";

const label = "I Oppdrag";

function useMarketplaceLinks(): SubNavItem[] {
  const state = useDemoState();
  const person = useCurrentPerson();

  const links: SubNavItem[] = [];
  if (person.seeksWork) {
    links.push({ label: "Min profil", path: "/profil" });
  }
  if (ownedBusiness(person.id, state) !== undefined) {
    links.push({ label: "Min bedrift", path: "/bedrift" });
  }
  if (isAdmin(person)) {
    links.push({ label: "Varodd-verktøy", path: "/admin" });
  }
  return links;
}

export function FeatureSubNav() {
  return <SubNav label={label} links={useMarketplaceLinks()} />;
}

export function FeatureLayout() {
  return <SubNavLayout label={label} useLinks={useMarketplaceLinks} />;
}
