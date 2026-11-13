import type { PressEvent } from "react-aria-components";
import { Button } from "./Button";
import "./Demo.css";

export interface TimeDebugButtonProps {
  label: string;
  onPress: (event: PressEvent) => void;
}

export function TimeDebugButton({ label, onPress }: TimeDebugButtonProps) {
  return (
    <Button
      variant="secondary"
      className="react-aria-Button time-debug-button"
      onPress={onPress}
    >
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span>Demo: {label}</span>
    </Button>
  );
}
