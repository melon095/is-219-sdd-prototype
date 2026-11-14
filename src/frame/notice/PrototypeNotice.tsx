import { useEffect, useRef, useState } from "react";
import {
  loadNoticeConfirmed,
  type StorageLike,
  saveNoticeConfirmed,
} from "../store/persistence";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import "./PrototypeNotice.css";

const waitSeconds = 5;

function secondsLeftAt(shownAt: number, now: number): number {
  return Math.max(0, waitSeconds - Math.floor((now - shownAt) / 1000));
}

function countdownText(seconds: number): string {
  return seconds === 1
    ? "Du kan gå videre om 1 sekund."
    : `Du kan gå videre om ${seconds} sekunder.`;
}

export function PrototypeNotice({ storage }: { storage: StorageLike }) {
  const [confirmed, setConfirmed] = useState(() =>
    loadNoticeConfirmed(storage),
  );
  const [shownAt] = useState(() => Date.now());
  const [secondsLeft, setSecondsLeft] = useState(waitSeconds);
  const focusPageHeading = useRef(false);
  const ready = secondsLeft === 0;

  useEffect(() => {
    if (confirmed || ready) {
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft(secondsLeftAt(shownAt, Date.now()));
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [confirmed, ready, shownAt]);

  useEffect(() => {
    if (confirmed && focusPageHeading.current) {
      focusPageHeading.current = false;
      document.querySelector("h1")?.focus();
    }
  }, [confirmed]);

  if (confirmed) {
    return null;
  }

  function confirm() {
    saveNoticeConfirmed(storage);
    focusPageHeading.current = true;
    setConfirmed(true);
  }

  return (
    <Dialog
      title="Dette er en prototype"
      isOpen
      isDismissable={false}
      isKeyboardDismissDisabled
    >
      <p>
        Denne nettsiden er ikke laget av Varodd, og den har ingen tilknytning
        til Varodd. Den er en prototype, laget som et studentprosjekt.
      </p>
      <p>
        Alle personer, bedrifter, oppdrag, spørsmål og svar her er oppdiktet. De
        viser ikke til noen ekte personer eller bedrifter.
      </p>
      <p>
        Det du endrer, lagres bare i din egen nettleser. Ingenting blir sendt
        noe sted.
      </p>
      <div className="prototype-notice-wait">
        {ready ? null : <p>{countdownText(secondsLeft)}</p>}
        <div role="status">{ready ? "Nå kan du gå videre." : ""}</div>
      </div>
      <div className="dialog-actions">
        <Button isDisabled={!ready} onPress={confirm}>
          Jeg forstår
        </Button>
      </div>
    </Dialog>
  );
}
