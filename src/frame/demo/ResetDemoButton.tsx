import { DialogTrigger } from "react-aria-components";
import { useNavigate } from "react-router";
import { useStore } from "../store/store";
import { AlertDialog } from "../ui/AlertDialog";
import { Button } from "../ui/Button";
import { useAnnounce } from "../ui/LiveAnnouncer";

export function ResetDemoButton({ goHome }: { goHome?: () => void }) {
  const store = useStore();
  const navigate = useNavigate();
  const announce = useAnnounce();

  function confirm() {
    store.reset();
    if (goHome === undefined) {
      navigate("/");
    } else {
      goHome();
    }
    announce("Demoen er tilbakestilt");
  }

  return (
    <DialogTrigger>
      <Button variant="secondary">Tilbakestill demo</Button>
      <AlertDialog
        title="Tilbakestill demo"
        text="Vil du tilbakestille demoen? Alle endringer i denne nettleseren blir slettet."
        confirmLabel="Tilbakestill"
        cancelLabel="Avbryt"
        onConfirm={confirm}
      />
    </DialogTrigger>
  );
}
