/**
 * Creates and injects a dynamic Web App Manifest for the public menu pages.
 * Uses the establishment's logo and name so the PWA install shows the store's branding.
 */

import { getAppBasePath, getPublicStorePath } from "@/lib/publicStoreUrl";

let currentBlobUrl: string | null = null;

export function setDynamicManifest(establishment: {
  name: string;
  logo_url?: string | null;
  slug: string;
}) {
  // Remove previous blob URL
  removeDynamicManifest();

  const basePath = getAppBasePath();
  const assetPath = (asset: string) => (basePath === "/" ? `/${asset}` : `${basePath}/${asset}`);

  const manifest = {
    name: establishment.name,
    short_name: establishment.name.substring(0, 12),
    description: `Cardápio digital de ${establishment.name}`,
    start_url: getPublicStorePath(establishment.slug) + "?source=pwa",
    display: "standalone" as const,
    background_color: "#ffffff",
    theme_color: "#e11d48",
    icons: establishment.logo_url
      ? [
          { src: establishment.logo_url, sizes: "192x192", type: "image/png" },
          { src: establishment.logo_url, sizes: "512x512", type: "image/png" },
          { src: establishment.logo_url, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ]
      : [
          { src: assetPath("pwa-192x192.png"), sizes: "192x192", type: "image/png" },
          { src: assetPath("pwa-512x512.png"), sizes: "512x512", type: "image/png" },
        ],
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
  currentBlobUrl = URL.createObjectURL(blob);

  // Remove existing static manifest link
  const existing = document.querySelector('link[rel="manifest"]');
  if (existing) existing.remove();

  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = currentBlobUrl;
  document.head.appendChild(link);

  // Also update theme-color meta
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = "#e11d48";
}

export function removeDynamicManifest() {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  const dynamicLink = document.querySelector('link[rel="manifest"]');
  if (dynamicLink && dynamicLink.getAttribute("href")?.startsWith("blob:")) {
    dynamicLink.remove();
  }
}
