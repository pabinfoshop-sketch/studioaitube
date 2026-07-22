export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Esta página não carregou — StudioAITube</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: oklch(0.16 0.05 285); color: oklch(0.98 0.01 300); display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2.5rem; border: 1px solid oklch(1 0 0 / 10%); border-radius: 1rem; background: oklch(0.22 0.06 285); }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: oklch(0.72 0.03 300); margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.5rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; transition: opacity 0.2s; }
      a:hover, button:hover { opacity: 0.85; }
      .primary { background: linear-gradient(135deg, oklch(0.68 0.19 250), oklch(0.78 0.15 220)); color: oklch(0.15 0.05 250); font-weight: 600; }
      .secondary { background: oklch(0.28 0.06 285); color: oklch(0.98 0.01 300); border-color: oklch(1 0 0 / 15%); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Esta página não carregou</h1>
      <p>Algo deu errado do nosso lado. Tente atualizar ou volte para a página inicial.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar novamente</button>
        <a class="secondary" href="/">Voltar ao início</a>
      </div>
    </div>
  </body>
</html>`;
}