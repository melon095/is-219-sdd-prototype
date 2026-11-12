import type { ReactNode } from "react";
import {
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  type MenuProps as AriaMenuProps,
  type MenuItemProps,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { Button, type ButtonVariant } from "./Button";
import "./ListBox.css";
import "./Navigation.css";

export interface MenuProps<T extends object>
  extends Omit<AriaMenuProps<T>, "children"> {
  label: string;
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Menu<T extends object>({
  label,
  variant = "secondary",
  children,
  ...props
}: MenuProps<T>) {
  return (
    <MenuTrigger>
      <Button variant={variant}>
        {label}
        <span aria-hidden="true" className="select-chevron">
          ▾
        </span>
      </Button>
      <Popover>
        <AriaMenu {...props}>{children}</AriaMenu>
      </Popover>
    </MenuTrigger>
  );
}

export function MenuItem(props: MenuItemProps) {
  return <AriaMenuItem {...props} />;
}
