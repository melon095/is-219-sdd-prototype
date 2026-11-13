import { type CalendarDate, parseDate } from "@internationalized/date";
import { useState } from "react";
import { DialogTrigger } from "react-aria-components";
import type { Command } from "../../../domain/frame/types";
import { outcomeLabel } from "../../../domain/marketplace/log";
import {
  canCancelRequest,
  canCompleteRequest,
  canRecordStart,
  canReturnToOpen,
} from "../../../domain/marketplace/permissions";
import type { TaskRequest } from "../../../domain/marketplace/types";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { AlertDialog } from "../../../frame/ui/AlertDialog";
import { Button } from "../../../frame/ui/Button";
import { DatePicker } from "../../../frame/ui/DatePicker";
import { Dialog } from "../../../frame/ui/Dialog";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { Radio, RadioGroup } from "../../../frame/ui/RadioGroup";
import { useFocusAfter } from "../../../frame/ui/useFocusAfter";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import "./RequestActions.css";

const completionOutcomes = ["as-planned", "extended", "permanent"] as const;

type CompletionOutcome = (typeof completionOutcomes)[number];

function isCompletionOutcome(value: string): value is CompletionOutcome {
  return completionOutcomes.some((item) => item === value);
}

function StartForm({
  request,
  onSubmit,
  close,
}: {
  request: TaskRequest;
  onSubmit: (actualStartDate: string) => void;
  close: () => void;
}) {
  const [date, setDate] = useState<CalendarDate | null>(
    parseDate(request.desiredStartDate),
  );

  return (
    <>
      <DatePicker
        label="Faktisk startdato"
        description="Datoen arbeidet faktisk startet."
        value={date}
        onChange={setDate}
        isRequired
      />
      <div className="dialog-actions">
        <Button variant="secondary" onPress={close}>
          Avbryt
        </Button>
        <Button
          isDisabled={date === null}
          onPress={() => {
            if (date !== null) {
              onSubmit(date.toString());
              close();
            }
          }}
        >
          Registrer
        </Button>
      </div>
    </>
  );
}

function CompleteForm({
  onSubmit,
  close,
}: {
  onSubmit: (outcome: CompletionOutcome) => void;
  close: () => void;
}) {
  const [outcome, setOutcome] = useState<string | null>(null);

  return (
    <>
      <RadioGroup
        label="Hvordan gikk oppdraget?"
        value={outcome}
        onChange={setOutcome}
        isRequired
      >
        {completionOutcomes.map((item) => (
          <Radio key={item} value={item}>
            {outcomeLabel(item)}
          </Radio>
        ))}
      </RadioGroup>
      <div className="dialog-actions">
        <Button variant="secondary" onPress={close}>
          Avbryt
        </Button>
        <Button
          isDisabled={outcome === null || !isCompletionOutcome(outcome)}
          onPress={() => {
            if (outcome !== null && isCompletionOutcome(outcome)) {
              onSubmit(outcome);
              close();
            }
          }}
        >
          Fullfør oppdraget
        </Button>
      </div>
    </>
  );
}

export function RequestActions({ request }: { request: TaskRequest }) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const focusAfter = useFocusAfter();
  const [error, setError] = useState<string | undefined>(undefined);

  const canStart = canRecordStart(person, request, state);
  const canComplete = canCompleteRequest(person, request, state);
  const canReopen = canReturnToOpen(person, request);
  const canCancel = canCancelRequest(person, request, state);
  if (!canStart && !canComplete && !canReopen && !canCancel) {
    return null;
  }

  const run = (command: Command, message: string) => {
    const result = dispatch(command);
    if (result.ok) {
      setError(undefined);
      announce(message);
      focusAfter("#detaljer-overskrift");
    } else {
      setError(result.error.message);
    }
  };

  return (
    <div className="request-actions">
      <div className="request-actions-buttons">
        {canStart && (
          <DialogTrigger>
            <Button>Registrer oppstart</Button>
            <Dialog title="Registrer oppstart">
              {({ close }) => (
                <StartForm
                  request={request}
                  close={close}
                  onSubmit={(actualStartDate) =>
                    run(
                      {
                        type: "recordStart",
                        requestId: request.id,
                        actualStartDate,
                      },
                      "Oppstarten er registrert",
                    )
                  }
                />
              )}
            </Dialog>
          </DialogTrigger>
        )}
        {canComplete && (
          <DialogTrigger>
            <Button>Marker som fullført</Button>
            <Dialog title="Marker som fullført">
              {({ close }) => (
                <CompleteForm
                  close={close}
                  onSubmit={(outcome) =>
                    run(
                      {
                        type: "completeRequest",
                        requestId: request.id,
                        outcome,
                      },
                      "Oppdraget er markert som fullført",
                    )
                  }
                />
              )}
            </Dialog>
          </DialogTrigger>
        )}
        {canReopen && (
          <Button
            onPress={() =>
              run(
                { type: "returnToOpen", requestId: request.id },
                "Oppdraget er åpent igjen",
              )
            }
          >
            Gjør åpen igjen
          </Button>
        )}
        {canCancel && (
          <DialogTrigger>
            <Button variant="secondary">Avlys</Button>
            <AlertDialog
              title="Avlys oppdraget?"
              text="Eieren og de som er med i oppdraget får beskjed."
              reasonLabel="Hvorfor avlyses oppdraget?"
              confirmLabel="Avlys oppdraget"
              cancelLabel="Avbryt"
              onConfirm={(reason) =>
                run(
                  {
                    type: "cancelRequest",
                    requestId: request.id,
                    reason: reason ?? "",
                  },
                  "Oppdraget er avlyst",
                )
              }
            />
          </DialogTrigger>
        )}
      </div>
      {error !== undefined && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
