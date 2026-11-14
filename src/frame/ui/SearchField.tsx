import {
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
  Button,
  FieldError,
  Input,
  Label,
  Text,
} from "react-aria-components";
import "./Field.css";
import "./SearchField.css";

export interface SearchFieldProps extends AriaSearchFieldProps {
  label: string;
  description?: string;
  placeholder?: string;
}

export function SearchField({
  label,
  description,
  placeholder,
  ...props
}: SearchFieldProps) {
  return (
    <AriaSearchField {...props}>
      <Label>{label}</Label>
      <div className="react-aria-SearchField-box">
        <Input placeholder={placeholder} />
        <Button aria-label="Tøm søket">
          <span aria-hidden="true">×</span>
        </Button>
      </div>
      {description && <Text slot="description">{description}</Text>}
      <FieldError />
    </AriaSearchField>
  );
}
