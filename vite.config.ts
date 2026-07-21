import { defineConfig } from "@lovable.dev/vite-tanstack-config";
export default defineConfig({
  vite: {
    define: {
      'import.meta.env.VITE_OPENROUTER_API_KEY': JSON.stringify(process.env.OPENROUTER_API_KEY || ''),
      'import.meta.env.VITE_REPLICATE_API_KEY': JSON.stringify(process.env.REPLICATE_API_KEY || ''),
      'import.meta.env.VITE_ELEVENLABS_API_KEY': JSON.stringify(process.env.ELEVENLABS_API_KEY || ''),
    },
  },
  tanstackStart: { server: { entry: "server" } },
  nitro: { preset: "cloudflare-pages" },
});
