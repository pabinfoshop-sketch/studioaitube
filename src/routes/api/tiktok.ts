import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// TikTok Content Posting API integration
// Requires: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI
// Flow: Server-side OAuth2 → access token → Direct Post API
//
// This endpoint handles:
// 1. OAuth callback (code → access_token exchange)
// 2. Refresh token
// 3. Upload video init → upload chunks → publish

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_UPLOAD_INIT = "https://open.tiktokapis.com/v2/post/publish/video/init/";
const TIKTOK_UPLOAD_URL = "https://open.tiktokapis.com/v2/post/publish/video/upload/";
const TIKTOK_PUBLISH_URL = "https://open.tiktokapis.com/v2/post/publish/content/init/";

export const Route = createFileRoute("/api/tiktok")({
  server: {
    handlers: {
      // ── Step 1: Exchange auth code for access token ──
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const action = z.string().parse(body.action);

          if (action === "auth-url") {
            // Return the URL the user should visit to authorize
            const clientId = process.env.TIKTOK_CLIENT_KEY;
            const redirectUri = process.env.TIKTOK_REDIRECT_URI || `${new URL(request.url).origin}/api/tiktok`;
            if (!clientId) {
              return Response.json({ error: "TIKTOK_CLIENT_KEY nao configurada. Adicione a env var." }, { status: 400 });
            }
            const scopes = "user.video.publish,video.list";
            const state = crypto.randomUUID().slice(0, 16);
            const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientId}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
            return Response.json({ authUrl, state });
          }

          if (action === "token") {
            // Exchange code for token
            const { code } = z.object({ code: z.string() }).parse(body);
            const clientId = process.env.TIKTOK_CLIENT_KEY;
            const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
            const redirectUri = process.env.TIKTOK_REDIRECT_URI || `${new URL(request.url).origin}/api/tiktok`;

            if (!clientId || !clientSecret) {
              return Response.json({ error: "TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET necessarios." }, { status: 400 });
            }

            const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_key: clientId,
                client_secret: clientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
              }),
            });

            const tokenData: any = await tokenRes.json();
            if (!tokenRes.ok || !tokenData.access_token) {
              return Response.json({ error: `TikTok auth falhou: ${JSON.stringify(tokenData)}` }, { status: 400 });
            }

            return Response.json({
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              expiresIn: tokenData.expires_in,
              openId: tokenData.open_id,
            });
          }

          if (action === "publish") {
            // Publish video to TikTok
            const { videoUrl, title, privacyLevel, accessToken } = z.object({
              videoUrl: z.string().url(),
              title: z.string().max(150),
              privacyLevel: z.enum(["PUBLIC_TO_EVERYONE", "FOLLOWERS_ONLY", "PRIVATE"]).default("PUBLIC_TO_EVERYONE"),
              accessToken: z.string(),
            }).parse(body);

            if (!accessToken) {
              return Response.json({ error: "AccessToken do TikTok nao fornecido." }, { status: 400 });
            }

            // Step 1: Init video upload
            const initRes = await fetch(TIKTOK_UPLOAD_INIT, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                post_info: {
                  title: title.slice(0, 150),
                  privacy_level: privacyLevel,
                  disable_duet: false,
                  disable_comment: false,
                  disable_stitch: false,
                },
                source_info: {
                  source: "PULL_FROM_URL",
                  video_url: videoUrl,
                },
              }),
            });

            const initData: any = await initRes.json();
            if (!initRes.ok) {
              return Response.json({ error: `TikTok init falhou: ${JSON.stringify(initData)}`, code: initData.error?.code, message: initData.error?.message }, { status: 502 });
            }

            const publishId = initData.data?.publish_id;
            if (!publishId) {
              return Response.json({ error: "Sem publish_id no retorno do TikTok.", raw: initData }, { status: 502 });
            }

            return Response.json({
              ok: true,
              publishId,
              message: "Video enviado ao TikTok. A publicacao pode levar alguns minutos.",
            });
          }

          return Response.json({ error: `Acao desconhecida: ${action}` }, { status: 400 });
        } catch (e: any) {
          if (e instanceof z.ZodError) {
            return Response.json({ error: `Parametros invalidos: ${e.issues.map(i => i.path.join(".")).join(", ")}` }, { status: 400 });
          }
          return Response.json({ error: e?.message ?? String(e) }, { status: 500 });
        }
      },

      // ── OAuth callback handler (GET) ──
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (!code) {
          // Return a simple HTML page for the OAuth flow
          return new Response(`<!DOCTYPE html><html><head><title>TikTok Auth</title></head>
<body style="background:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
<div style="text-align:center;">
<h2>TikTok Conectado!</h2>
<p style="color:#999;">Voce pode fechar esta aba e voltar ao Studio.</p>
<script>
if(window.opener){window.opener.postMessage({type:'tiktok-auth',code:new URLSearchParams(location.search).get('code')},'*');}
</script>
</div></body></html>`, {
            headers: { "Content-Type": "text/html" },
          });
        }

        // Return success page that sends code to parent window
        return new Response(`<!DOCTYPE html><html><head><title>TikTok Auth</title></head>
<body style="background:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
<div style="text-align:center;">
<h2 style="color:#00f2ea;">TikTok Conectado com Sucesso!</h2>
<p style="color:#aaa;">Voce pode fechar esta aba e voltar ao StudioAITube.</p>
<script>
window.opener.postMessage({type:'tiktok-auth',code:'${code}',state:'${state ?? ""}'},'*');
window.close();
</script>
</div></body></html>`, {
          headers: { "Content-Type": "text/html" },
        });
      },
    },
  },
});