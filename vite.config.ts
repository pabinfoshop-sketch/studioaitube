// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// ── Gera public/_env.json no build time com as API keys ──
// Este arquivo estático garante que as chaves cheguem ao cliente
// independente da plataforma (Cloudflare, Vercel, Netlify, etc.)
const _dir = dirname(fileURLToPath(import.meta.url));
const _envJson = JSON.stringify({
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  REPLICATE_API_KEY: process.env.REPLICATE_API_KEY || "",
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || "",
});
mkdirSync(resolve(_dir, "public"), { recursive: true });
writeFileSync(resolve(_dir, "public/_env.json"), _envJson);

export default defineConfig({
  // Mapeia env vars do servidor para o cliente no build time.
  // No Cloudflare Pages, as vars configuradas no painel ficam disponíveis no build.
  vite: {
    define: {
      'import.meta.env.VITE_OPENROUTER_API_KEY': JSON.stringify(process.env.OPENROUTER_API_KEY || ''),
      'import.meta.env.VITE_REPLICATE_API_KEY': JSON.stringify(process.env.REPLICATE_API_KEY || ''),
      'import.meta.env.VITE_ELEVENLABS_API_KEY': JSON.stringify(process.env.ELEVENLABS_API_KEY || ''),
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  // Deploy target: Cloudflare Pages
  nitro: {
    preset: "cloudflare-pages",
    // Headers necessários para ffmpeg.wasm (SharedArrayBuffer)
    routeRules: {
      "/**": {
        headers: {
          "Cross-Origin-Opener-Policy": "same-origin",
          "Cross-Origin-Embedder-Policy": "credentialless",
        },
      },
    },
  },
});