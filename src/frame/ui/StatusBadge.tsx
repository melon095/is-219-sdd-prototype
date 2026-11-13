import "./Content.css";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "error";

export interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className="status-badge" data-tone={tone}>
      {label}
    </span>
  );
}
