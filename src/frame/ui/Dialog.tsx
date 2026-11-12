import type { ReactNode } from "react";
import {
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
  type ModalOverlayProps,
} from "react-aria-components";
import "./Dialog.css";

export interface DialogProps
  extends Pick<
    ModalOverlayProps,
    "isOpen" | "onOpenChange" | "isDismissable" | "isKeyboardDismissDisabled"
  > {
  title: string;
  children: ReactNode | ((opts: { close: () => void }) => ReactNode);
}

export function Dialog({
  title,
  children,
  isDismissable = true,
  ...overlayProps
}: DialogProps) {
  return (
    <ModalOverlay {...overlayProps} isDismissable={isDismissable}>
      <Modal>
        <AriaDialog>
          {({ close }) => (
            <>
              <Heading slot="title">{title}</Heading>
              <div className="dialog-body">
                {typeof children === "function"
                  ? children({ close })
                  : children}
              </div>
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
