import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components";
import "./Button.css";

export type ButtonVariant = "primary" | "secondary" | "quiet";

export interface ButtonProps extends AriaButtonProps {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", ...props }: ButtonProps) {
  return <AriaButton {...props} data-variant={variant} />;
}
