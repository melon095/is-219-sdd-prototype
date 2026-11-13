import { useStorageAvailable } from "../store/store";
import "./Footer.css";

export function Footer() {
  const storageAvailable = useStorageAvailable();

  return (
    <div className="footer">
      <p>
        Dette er en prototype. Alle personer, bedrifter og data er oppdiktet.
      </p>
      {!storageAvailable && <p>Endringer lagres ikke i denne nettleseren</p>}
    </div>
  );
}
