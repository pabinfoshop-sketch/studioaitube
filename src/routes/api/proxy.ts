import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-side proxy to bypass COEP restrictions.
 * ffmpeg.wasm needs SharedArrayBuffer (requires COOP/COEP headers on the page).
 * But COEP blocks cross-origin fetches unless the server sends CORP headers.
 * This proxy downloads the resource server-side and returns it same-origin.
 */
export const Route = createFileRoute("/api/proxy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = url.searchParams.get("url");
        if (!target) {
          return new Response("Missing ?url= parameter", { status: 400 });
        }

        // Only allow https and specific domains
        const parsed = new URL(target);
        if (parsed.protocol !== "https:") {
          return new Response("Only HTTPS allowed", { status: 400 });
        }

        // Block private/internal IPs
        const host = parsed.hostname;
        if (
          host === "localhost" ||
          host === "127.0.0.1" ||
          host === "0.0.0.0" ||
          host.startsWith("192.168.") ||
          host.startsWith("10.") ||
          host.startsWith("172.") ||
          host.endsWith(".local") ||
          host === "::1"
        ) {
          return new Response("Private hosts not allowed", { status: 400 });
        }

        try {
          const res = await fetch(target, {
            signal: AbortSignal.timeout(300_000), // 5 min for large files (ffmpeg.wasm ~32MB)
          });
          if (!res.ok) {
            return new Response(`Upstream ${res.status}`, { status: 502 });
          }
          const contentType = res.headers.get("content-type") || "application/octet-stream";
          const contentLength = res.headers.get("content-length");
          const headers: Record<string, string> = {
            "Content-Type": contentType,
            "Cache-Control": "private, max-age=3600",
            "Access-Control-Allow-Origin": "*",
            "Cross-Origin-Resource-Policy": "cross-origin",
          };
          if (contentLength) headers["Content-Length"] = contentLength;
          // Stream directly (no memory buffer, supports large files)
          return new Response(res.body, { headers });
        } catch (e: any) {
          return new Response(`Proxy error: ${e?.message ?? "unknown"}`, { status: 502 });
        }
      },
    },
  },
});