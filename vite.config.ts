// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

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
  },
});