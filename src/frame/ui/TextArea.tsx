import {
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  FieldError,
  Label,
  Text,
  type ValidationResult,
} from "react-aria-components";
import "./Field.css";

export interface TextAreaProps extends AriaTextFieldProps {
  label: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
  rows?: number;
}

export function TextArea({
  label,
  description,
  errorMessage,
  placeholder,
  rows = 4,
  ...props
}: TextAreaProps) {
  return (
    <AriaTextField {...props}>
      <Label>{label}</Label>
      <AriaTextArea placeholder={placeholder} rows={rows} />
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaTextField>
  );
}
