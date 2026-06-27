import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

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
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
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