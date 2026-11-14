import type { ReactNode } from "react";
import {
  Disclosure as AriaDisclosure,
  type DisclosureProps as AriaDisclosureProps,
  DisclosurePanel,
  Heading,
} from "react-aria-components";
import { Button } from "./Button";
import "./Navigation.css";

export interface DisclosureProps extends Omit<AriaDisclosureProps, "children"> {
  title: string;
  headingLevel?: 2 | 3 | 4;
  children: ReactNode;
}

export function Disclosure({
  title,
  headingLevel = 3,
  children,
  ...props
}: DisclosureProps) {
  return (
    <AriaDisclosure {...props}>
      <Heading level={headingLevel}>
        <Button slot="trigger" variant="quiet">
          <span aria-hidden="true" className="disclosure-chevron">
            ▸
          </span>
          {title}
        </Button>
      </Heading>
      <DisclosurePanel>{children}</DisclosurePanel>
    </AriaDisclosure>
  );
}
