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

const devServerHost =
  process.env.VITE_DEV_SERVER_HOST ||
  process.env.VITE_DEV_SERVER_ORIGIN?.replace(/^https?:\/\//, "");

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    ...(devServerHost
      ? {
          hmr: {
            protocol: "wss",
            host: devServerHost,
            clientPort: 443,
          },
        }
      : {}),
  },
  // ✅ DESACTIVAR MODULE PRELOAD PARA EVITAR WARNINGS
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,woff2}",
          "**/*.pdf"
        ],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/[^/]+\/assets\//,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https?:\/\/[^/]+\/favicon_io\//,
            handler: "CacheFirst",
            options: {
              cacheName: "favicon-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https?:\/\/[^/]+\.pdf$/,
            handler: "CacheFirst",
            options: {
              cacheName: "pdf-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
        navigateFallback: "index.html",
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": toFsPath(new URL("./src", import.meta.url)),
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv", "**/*.pdf"],
});