import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

function toFsPath(url: URL) {
  return decodeURIComponent(url.pathname).replace(/^\/([A-Za-z]:)/, "$1");
}

function figmaAssetResolver() {
  return {
    name: "figma-asset-resolver",
    resolveId(id: string) {
      if (id.startsWith("figma:asset/")) {
        const filename = id.replace("figma:asset/", "");
        return toFsPath(new URL(`./src/assets/${filename}`, import.meta.url));
      }
    },
  };
}

export default defineConfig({
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "favicon_io/favicon.ico",
        "favicon_io/favicon-16x16.png",
        "favicon_io/favicon-32x32.png",
        "favicon_io/android-chrome-192x192.png",
        "favicon_io/android-chrome-512x512.png",
        "favicon_io/apple-touch-icon.png",
        "offline.html",
      ],
      manifest: {
        name: "Gestión Académica Digital",
        short_name: "GAD",
        description: "Gestión Académica digital para docentes y grupos",
        theme_color: "#0f766e",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "favicon_io/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "favicon_io/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "favicon_io/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
          {
            src: "favicon_io/favicon-32x32.png",
            sizes: "32x32",
            type: "image/png",
          },
          {
            src: "favicon_io/favicon-16x16.png",
            sizes: "16x16",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,png,svg,ico,json,woff2,woff}",
          "offline.html",
        ],
        navigateFallback: "/offline.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === "document" || request.destination === "",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "assets-cache",
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https?:.*\/api\/.*$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      "@": toFsPath(new URL("./src", import.meta.url)),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
