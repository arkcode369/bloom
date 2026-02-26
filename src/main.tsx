import React from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";
import { preventWebBehaviors } from "./lib/preventWebBehaviors";

// Block browser-native shortcuts & behaviors (print, save, refresh, etc.)
preventWebBehaviors();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
