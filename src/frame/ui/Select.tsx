import type { ReactNode } from "react";
import {
  Select as AriaSelect,
  type SelectProps as AriaSelectProps,
  Button,
  FieldError,
  Header,
  Label,
  ListBox,
  ListBoxItem,
  type ListBoxItemProps,
  ListBoxSection,
  type ListBoxSectionProps,
  Popover,
  SelectValue,
  Text,
  type ValidationResult,
} from "react-aria-components";
import "./Field.css";
import "./ListBox.css";

export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, "children"> {
  label: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  items?: Iterable<T>;
  children: ReactNode | ((item: T) => ReactNode);
}

export function Select<T extends object>({
  label,
  description,
  errorMessage,
  children,
  items,
  ...props
}: SelectProps<T>) {
  return (
    <AriaSelect {...props}>
      <Label>{label}</Label>
      <Button>
        <SelectValue />
        <span aria-hidden="true" className="select-chevron">
          ▾
        </span>
      </Button>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
      <Popover>
        <ListBox items={items}>{children}</ListBox>
      </Popover>
    </AriaSelect>
  );
}

export function SelectItem(props: ListBoxItemProps) {
  return <ListBoxItem {...props} />;
}

export interface SelectSectionProps<T extends object>
  extends Omit<ListBoxSectionProps<T>, "children"> {
  title: string;
  children: ReactNode;
}

export function SelectSection<T extends object>({
  title,
  children,
  ...props
}: SelectSectionProps<T>) {
  return (
    <ListBoxSection {...props}>
      <Header>{title}</Header>
      {children}
    </ListBoxSection>
  );
}
