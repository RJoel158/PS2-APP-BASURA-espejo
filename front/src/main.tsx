// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { isLogSilenced } from "./config/environment";

// Bootstrap CSS + bundle (JS necesario para collapse, dropdowns)
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

// tu CSS global (fuentes, variables)
import "./index.css";

if (isLogSilenced()) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker only in production to avoid stale cache during local development
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('SW registered:', reg.scope);
    }).catch((err) => {
      console.log('SW registration failed:', err);
    });
  });
}
