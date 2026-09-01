import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// Build stamp — lets us tell which commit a deployed bundle was built from.
// Vercel exposes VERCEL_GIT_COMMIT_SHA during the build; locally there is no such
// env var, so fall back to "local". Purely diagnostic: injected as a <meta> tag so
// `curl <site> | grep build-commit` answers "is my push actually deployed?"
// without needing Vercel dashboard access.
const buildCommit = (
  process.env["VERCEL_GIT_COMMIT_SHA"] ??
  process.env["GIT_COMMIT_SHA"] ??
  "local"
).slice(0, 7);

function buildStampPlugin(): import("vite").Plugin {
  return {
    name: "wa-build-stamp",
    transformIndexHtml(html: string): string {
      return html.replace(
        "</head>",
        `  <meta name="build-commit" content="${buildCommit}" />\n  </head>`,
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    buildStampPlugin(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    // Code-split: separate chunk for admin bundle (REQUIREMENT.md §11)
    // React Router v7 lazy() handles route-level splitting automatically.
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-i18n": ["i18next", "react-i18next"],
        },
      },
    },
  },
});
