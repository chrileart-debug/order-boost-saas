import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA: Guard service worker registration against iframes and preview hosts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

// Inject static manifest only for admin/dashboard routes
// Public menu routes will inject dynamic manifests via dynamicManifest.ts
const path = window.location.pathname;
const isPublicStore = path.match(/^\/[^/]+$/) && !["", "login", "signup", "onboarding", "dashboard"].includes(path.slice(1));
const isOrderTracking = path.startsWith("/pedido/");

if (!isPublicStore && !isOrderTracking) {
  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = "/manifest.json";
  document.head.appendChild(link);
}

createRoot(document.getElementById("root")!).render(<App />);
