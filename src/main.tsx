import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./frame/design/fonts";
import "./frame/design/tokens.css";
import "./frame/design/base.css";

const container = document.getElementById("root");

if (container === null) {
  throw new Error("Fant ikke elementet #root.");
}

createRoot(container).render(<App />);
