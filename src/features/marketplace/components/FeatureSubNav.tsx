import { Outlet, useLocation } from "react-router";
import { isAdmin, ownedBusiness } from "../../../domain/frame/people";
import { useDemoState } from "../../../frame/store/store";
import { Link } from "../../../frame/ui/Link";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import "./FeatureSubNav.css";

export function FeatureSubNav() {
  const state = useDemoState();
  const person = useCurrentPerson();
  const { pathname } = useLocation();

  const links: { label: string; path: string }[] = [];
  if (person.seeksWork) {
    links.push({ label: "Min profil", path: "/profil" });
  }
  if (ownedBusiness(person.id, state) !== undefined) {
    links.push({ label: "Min bedrift", path: "/bedrift" });
  }
  if (isAdmin(person)) {
    links.push({ label: "Varodd-verktøy", path: "/admin" });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <nav aria-label="I Oppdrag" className="feature-subnav">
      <ul className="feature-subnav-list">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              href={link.path}
              aria-current={pathname === link.path ? "page" : undefined}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function FeatureLayout() {
  return (
    <>
      <FeatureSubNav />
      <Outlet />
    </>
  );
}
