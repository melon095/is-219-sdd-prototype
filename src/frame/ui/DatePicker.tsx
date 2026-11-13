import type { CalendarDate } from "@internationalized/date";
import {
  DatePicker as AriaDatePicker,
  type DatePickerProps as AriaDatePickerProps,
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DateSegment,
  Dialog,
  FieldError,
  Group,
  Heading,
  Label,
  Popover,
  Text,
  type ValidationResult,
} from "react-aria-components";
import "./Field.css";
import "./ListBox.css";
import "./DatePicker.css";

export interface DatePickerProps
  extends Omit<AriaDatePickerProps<CalendarDate>, "children"> {
  label: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function DatePicker({
  label,
  description,
  errorMessage,
  ...props
}: DatePickerProps) {
  return (
    <AriaDatePicker {...props}>
      <Label>{label}</Label>
      <Group>
        <DateInput>{(segment) => <DateSegment segment={segment} />}</DateInput>
        <Button>
          <span className="date-picker-icon">
            <svg
              viewBox="0 0 20 20"
              width="20"
              height="20"
              focusable="false"
              aria-hidden="true"
            >
              <rect
                x="2.5"
                y="4.5"
                width="15"
                height="13"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M2.5 8.5h15M6.5 2.5v4M13.5 2.5v4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </Button>
      </Group>
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
      <Popover>
        <Dialog>
          <Calendar>
            <header className="date-picker-header">
              <Button slot="previous">
                <span aria-hidden="true">‹</span>
              </Button>
              <Heading />
              <Button slot="next">
                <span aria-hidden="true">›</span>
              </Button>
            </header>
            <CalendarGrid weekdayStyle="short">
              {(date) => <CalendarCell date={date} />}
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );
}
