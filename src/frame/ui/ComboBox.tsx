import type { ReactNode } from "react";
import {
  ComboBox as AriaComboBox,
  type ComboBoxProps as AriaComboBoxProps,
  Button,
  FieldError,
  Group,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  type ListBoxItemProps,
  Popover,
  Text,
  type ValidationResult,
} from "react-aria-components";
import "./Field.css";
import "./ListBox.css";

export interface ComboBoxProps<T extends object>
  extends Omit<AriaComboBoxProps<T>, "children"> {
  label: string;
  description?: ReactNode;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
  items?: Iterable<T>;
  children: ReactNode | ((item: T) => ReactNode);
}

export function ComboBox<T extends object>({
  label,
  description,
  errorMessage,
  placeholder,
  children,
  items,
  ...props
}: ComboBoxProps<T>) {
  return (
    <AriaComboBox {...props}>
      <Label>{label}</Label>
      <Group>
        <Input placeholder={placeholder} />
        <Button aria-label="Vis forslag">
          <span aria-hidden="true" className="select-chevron">
            ▾
          </span>
        </Button>
      </Group>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
      <Popover>
        <ListBox items={items}>{children}</ListBox>
      </Popover>
    </AriaComboBox>
  );
}

export function ComboBoxItem(props: ListBoxItemProps) {
  return <ListBoxItem {...props} />;
}
