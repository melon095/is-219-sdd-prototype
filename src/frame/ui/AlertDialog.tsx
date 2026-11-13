import { useState } from "react";
import {
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
  type ModalOverlayProps,
} from "react-aria-components";
import { Button } from "./Button";
import { TextArea } from "./TextArea";
import "./Dialog.css";

const REASON_MAX_LENGTH = 1000;

export interface AlertDialogProps
  extends Pick<ModalOverlayProps, "isOpen" | "onOpenChange"> {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (reason?: string) => void;
  reasonLabel?: string;
}

function AlertDialogContent({
  title,
  text,
  confirmLabel,
  cancelLabel,
  onConfirm,
  reasonLabel,
  close,
}: Omit<AlertDialogProps, "isOpen" | "onOpenChange"> & {
  close: () => void;
}) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const reasonIsValid =
    trimmed.length >= 1 && trimmed.length <= REASON_MAX_LENGTH;
  const canConfirm = reasonLabel === undefined || reasonIsValid;

  const confirm = () => {
    onConfirm(reasonLabel === undefined ? undefined : trimmed);
    close();
  };

  return (
    <>
      <Heading slot="title">{title}</Heading>
      <div className="dialog-body">
        <p>{text}</p>
        {reasonLabel !== undefined && (
          <TextArea
            label={reasonLabel}
            isRequired
            maxLength={REASON_MAX_LENGTH}
            value={reason}
            onChange={setReason}
            description={`Mellom 1 og ${REASON_MAX_LENGTH} tegn.`}
          />
        )}
      </div>
      <div className="dialog-actions">
        <Button variant="secondary" onPress={close}>
          {cancelLabel}
        </Button>
        <Button onPress={confirm} isDisabled={!canConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </>
  );
}

export function AlertDialog({
  isOpen,
  onOpenChange,
  ...content
}: AlertDialogProps) {
  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal>
        <AriaDialog role="alertdialog">
          {({ close }) => <AlertDialogContent {...content} close={close} />}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
