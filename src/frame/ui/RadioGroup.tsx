import type { ReactNode } from "react";
import {
  Radio as AriaRadio,
  RadioGroup as AriaRadioGroup,
  type RadioGroupProps as AriaRadioGroupProps,
  FieldError,
  Label,
  type RadioProps,
  Text,
  type ValidationResult,
} from "react-aria-components";
import "./Choice.css";

export interface RadioGroupProps extends Omit<AriaRadioGroupProps, "children"> {
  label: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  children: ReactNode;
}

export function RadioGroup({
  label,
  description,
  errorMessage,
  children,
  ...props
}: RadioGroupProps) {
  return (
    <AriaRadioGroup {...props}>
      <Label>{label}</Label>
      {children}
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaRadioGroup>
  );
}

export function Radio(props: RadioProps) {
  return <AriaRadio {...props} />;
}
