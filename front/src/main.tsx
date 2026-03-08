// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Bootstrap CSS + bundle (JS necesario para collapse, dropdowns)
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

// tu CSS global (fuentes, variables)
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('SW registered:', reg.scope);
    }).catch((err) => {
      console.log('SW registration failed:', err);
    });
  });
}
