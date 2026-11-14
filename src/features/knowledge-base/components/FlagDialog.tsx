import { useState } from "react";
import { DialogTrigger } from "react-aria-components";
import {
  canFlag,
  hasFlagged,
} from "../../../domain/knowledge-base/permissions";
import type { ContentTarget } from "../../../domain/knowledge-base/types";
import { useDemoState, useDispatch } from "../../../frame/store/store";
import { Button } from "../../../frame/ui/Button";
import { Dialog } from "../../../frame/ui/Dialog";
import { useAnnounce } from "../../../frame/ui/LiveAnnouncer";
import { Notice } from "../../../frame/ui/Notice";
import { Radio, RadioGroup } from "../../../frame/ui/RadioGroup";
import { TextArea } from "../../../frame/ui/TextArea";
import { focusAfterRender } from "../../../frame/ui/useFocusAfter";
import { useCurrentPerson } from "../../../frame/users/useCurrentPerson";
import { flagReasons } from "../labels";
import "./Moderation.css";

const noteLabel = "Fortell kort hva som er galt";

function FlagForm({
  target,
  close,
  controlSelector,
}: {
  target: ContentTarget;
  close: () => void;
  controlSelector: string;
}) {
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const send = () => {
    const result = dispatch({
      type: "flagContent",
      targetKind: target.targetKind,
      targetId: target.targetId,
      reason: reason ?? undefined,
      note,
    });
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setFormError(
        result.error.fieldErrors === undefined
          ? result.error.message
          : undefined,
      );
      return;
    }
    const message = result.notices[0]?.message;
    if (message !== undefined) {
      announce(message);
    }
    close();
    focusAfterRender(controlSelector);
  };

  return (
    <>
      {formError !== undefined && <Notice tone="error">{formError}</Notice>}
      <RadioGroup
        label="Hva er galt?"
        value={reason}
        onChange={(value) => {
          setReason(value);
          setErrors((previous) => ({ ...previous, reason: "" }));
        }}
        isInvalid={Boolean(errors.reason)}
        errorMessage={errors.reason}
      >
        {flagReasons.map((item) => (
          <Radio key={item.value} value={item.value}>
            {item.label}
          </Radio>
        ))}
      </RadioGroup>
      <TextArea
        label={noteLabel}
        rows={4}
        maxLength={500}
        isRequired={reason === "other"}
        value={note}
        onChange={(value) => {
          setNote(value);
          setErrors((previous) => ({ ...previous, note: "" }));
        }}
        isInvalid={Boolean(errors.note)}
        errorMessage={errors.note}
      />
      <div className="dialog-actions">
        <Button variant="secondary" onPress={close}>
          Avbryt
        </Button>
        <Button onPress={send}>Send</Button>
      </div>
    </>
  );
}

export function FlagDialog({ target }: { target: ContentTarget }) {
  const state = useDemoState();
  const person = useCurrentPerson();
  const key = `${target.targetKind}-${target.targetId}`;

  if (canFlag(person, target, state)) {
    return (
      <DialogTrigger>
        <Button variant="quiet">Flagg</Button>
        <Dialog title="Flagg innlegget">
          {({ close }) => (
            <FlagForm
              target={target}
              close={close}
              controlSelector={`[data-flag-target="${key}"]`}
            />
          )}
        </Dialog>
      </DialogTrigger>
    );
  }
  if (hasFlagged(person, target, state)) {
    return (
      <span className="flag-control-done" data-flag-target={key} tabIndex={-1}>
        Du har flagget dette
      </span>
    );
  }
  return null;
}
