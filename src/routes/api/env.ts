import { createFileRoute } from "@tanstack/react-router";

// Endpoint leve de diagnóstico. Nunca expõe valores de secrets para o browser.
export const Route = createFileRoute("/api/env")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
          REPLICATE_API_KEY: !!process.env.REPLICATE_API_KEY,
          ELEVENLABS_API_KEY: !!process.env.ELEVENLABS_API_KEY,
        });
      },
    },
  },
});// rebuild trigger 1784611910
