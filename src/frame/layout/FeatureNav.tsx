import { useLocation } from "react-router";
import { features } from "../../app/features";
import { Link } from "../ui/Link";
import "./FeatureNav.css";

type NavItem = { key: string; label: string; path: string; current: boolean };

export function FeatureNav() {
  const { pathname } = useLocation();

  const items: NavItem[] = [
    { key: "hjem", label: "Hjem", path: "/", current: pathname === "/" },
    ...features.map((feature) => ({
      key: feature.id,
      label: feature.label,
      path: feature.basePath,
      current:
        pathname === feature.basePath ||
        pathname.startsWith(`${feature.basePath}/`),
    })),
  ];

  return (
    <nav aria-label="Hovedmeny" className="feature-nav">
      <ul className="feature-nav-list">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.path}
              aria-current={item.current ? "page" : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
