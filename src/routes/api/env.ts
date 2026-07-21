import { createFileRoute } from "@tanstack/react-router";

// Endpoint leve que expõe as chaves de API para o cliente (browser).
// Usado como fallback runtime caso as chaves não tenham sido injetadas no build.
// Responde em < 5ms — sem risco de timeout do Netlify Functions.
export const Route = createFileRoute("/api/env")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
          REPLICATE_API_KEY: process.env.REPLICATE_API_KEY || "",
          ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || "",
        });
      },
    },
  },
});// rebuild trigger 1784611910
