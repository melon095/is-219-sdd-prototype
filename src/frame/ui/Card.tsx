import type { ReactNode } from "react";
import { Heading } from "react-aria-components";
import "./Content.css";

export interface CardProps {
  heading: string;
  headingLevel?: 2 | 3 | 4;
  action?: ReactNode;
  children?: ReactNode;
}

export function Card({
  heading,
  headingLevel = 2,
  action,
  children,
}: CardProps) {
  return (
    <section className="card">
      <Heading level={headingLevel} className="card-heading">
        {heading}
      </Heading>
      {children && <div className="card-text">{children}</div>}
      {action && <div className="card-action">{action}</div>}
    </section>
  );
}
