import type { ReactNode } from "react";
import "./Content.css";

export type NoticeTone = "info" | "success" | "warning" | "error";

export interface NoticeProps {
  tone: NoticeTone;
  title?: string;
  children?: ReactNode;
}

const toneLabels: Record<NoticeTone, string> = {
  info: "Informasjon:",
  success: "Vellykket:",
  warning: "Advarsel:",
  error: "Feil:",
};

const toneIcons: Record<NoticeTone, string> = {
  info: "i",
  success: "✓",
  warning: "!",
  error: "×",
};

export function Notice({ tone, title, children }: NoticeProps) {
  return (
    <div
      className="notice"
      data-tone={tone}
      role={tone === "error" ? "alert" : undefined}
    >
      <span className="notice-icon" aria-hidden="true">
        {toneIcons[tone]}
      </span>
      <div className="notice-body">
        <span className="visually-hidden">{toneLabels[tone]} </span>
        {title && <p className="notice-title">{title}</p>}
        {children && <div className="notice-text">{children}</div>}
      </div>
    </div>
  );
}
