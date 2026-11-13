import {
  NumberField as AriaNumberField,
  type NumberFieldProps as AriaNumberFieldProps,
  Button,
  FieldError,
  Group,
  Input,
  Label,
  Text,
  type ValidationResult,
} from "react-aria-components";
import "./Field.css";

export interface NumberFieldProps extends AriaNumberFieldProps {
  label: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function NumberField({
  label,
  description,
  errorMessage,
  ...props
}: NumberFieldProps) {
  return (
    <AriaNumberField {...props}>
      <Label>{label}</Label>
      <Group>
        <Button slot="increment">
          <span aria-hidden="true">+</span>
        </Button>
        <Input />
        <Button slot="decrement">
          <span aria-hidden="true">−</span>
        </Button>
      </Group>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaNumberField>
  );
}
