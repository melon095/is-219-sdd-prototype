import type { ReactNode } from "react";
import "./Content.css";

export interface EmptyStateProps {
  title: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function EmptyState({ title, action, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      {children && <div className="empty-state-text">{children}</div>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
