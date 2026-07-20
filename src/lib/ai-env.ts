function firstConfiguredEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return { value, name };
  }
  return null;
}

export function getOpenRouterKey() {
  return firstConfiguredEnv(["OPENROUTER_API_KEY", "OPEN_ROUTER_API_KEY", "OPENROUTER_KEY"]);
}

export function getReplicateKey() {
  return firstConfiguredEnv(["REPLICATE_API_KEY", "REPLICATE_API_TOKEN", "REPLICATE_TOKEN"]);
}

export function getLovableKey() {
  return firstConfiguredEnv(["LOVABLE_API_KEY"]);
}

export function missingAiKeysNotice() {
  return "Sem chaves de IA configuradas no ambiente deste deploy. Configure OPENROUTER_API_KEY para roteiro/imagens e REPLICATE_API_KEY para animações; rascunho local gerado.";
}