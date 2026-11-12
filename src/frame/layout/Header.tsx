import { ResetDemoButton } from "../demo/ResetDemoButton";
import { useLayout } from "../store/useLayout";
import { Link } from "../ui/Link";
import { UserSwitcher } from "../users/UserSwitcher";
import { FeatureNav } from "./FeatureNav";
import { MobileMenu } from "./MobileMenu";
import "./Header.css";

export function Header() {
  const layout = useLayout();

  return (
    <div className="header">
      <div className="header-inner">
        <span className="header-brand">
          <Link href="/">Varodd</Link>
        </span>
        {layout === "desktop" ? (
          <div className="header-bar">
            <FeatureNav />
            <div className="header-controls">
              <UserSwitcher />
              <ResetDemoButton />
            </div>
          </div>
        ) : (
          <MobileMenu />
        )}
      </div>
    </div>
  );
}
