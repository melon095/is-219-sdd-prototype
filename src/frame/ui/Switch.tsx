import type { ReactNode } from "react";
import {
  Switch as AriaSwitch,
  type SwitchProps as AriaSwitchProps,
} from "react-aria-components";
import "./Choice.css";

export interface SwitchProps extends Omit<AriaSwitchProps, "children"> {
  children: ReactNode;
}

export function Switch({ children, ...props }: SwitchProps) {
  return (
    <AriaSwitch {...props}>
      <span className="switch-indicator" aria-hidden="true" />
      {children}
    </AriaSwitch>
  );
}
