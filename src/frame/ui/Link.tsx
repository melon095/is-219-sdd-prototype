import {
  Link as AriaLink,
  type LinkProps as AriaLinkProps,
} from "react-aria-components";
import "./Link.css";

export type LinkProps = AriaLinkProps;

export function Link(props: LinkProps) {
  return <AriaLink {...props} />;
}
