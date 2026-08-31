// apps/web/src/main.tsx
// i18n must be imported before App so translations are ready before first render.
import "@/i18n/index";
import "@/index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
