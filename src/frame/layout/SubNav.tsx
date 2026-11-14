import { Outlet, useLocation } from "react-router";
import { Link } from "../ui/Link";
import "./SubNav.css";

export type SubNavItem = {
  label: string;
  path: string;
  badge?: string;
};

export type SubNavProps = {
  label: string;
  links: SubNavItem[];
};

export function SubNav({ label, links }: SubNavProps) {
  const { pathname } = useLocation();

  if (links.length === 0) {
    return null;
  }

  return (
    <nav aria-label={label} className="subnav">
      <ul className="subnav-list">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              href={link.path}
              aria-current={pathname === link.path ? "page" : undefined}
            >
              {link.label}
              {link.badge !== undefined && (
                <>
                  {" "}
                  <span className="subnav-badge">{link.badge}</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export type SubNavLayoutProps = {
  label: string;
  useLinks: () => SubNavItem[];
};

export function SubNavLayout({ label, useLinks }: SubNavLayoutProps) {
  const links = useLinks();

  return (
    <>
      <SubNav label={label} links={links} />
      <Outlet />
    </>
  );
}
