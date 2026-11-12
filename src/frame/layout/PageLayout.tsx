import { type ReactNode, useRef } from "react";
import { Link } from "../ui/Link";
import "./PageLayout.css";

export function PageLayout({
  header,
  footer,
  children,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const mainRef = useRef<HTMLElement>(null);

  return (
    <div className="page-layout">
      <Link className="skip-link" onPress={() => mainRef.current?.focus()}>
        Hopp til hovedinnhold
      </Link>
      <header className="page-layout-header">{header}</header>
      <main
        id="hovedinnhold"
        ref={mainRef}
        tabIndex={-1}
        className="page-layout-main"
      >
        <div className="page-layout-content">{children}</div>
      </main>
      <footer className="page-layout-footer">{footer}</footer>
    </div>
  );
}
