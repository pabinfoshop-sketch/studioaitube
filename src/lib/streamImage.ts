export async function streamImage(
  endpoint: string,
  prompt: string,
  onFrame: (dataUrl: string, isFinal: boolean, modelUsed?: string) => void,
): Promise<string | undefined> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(await res.text());
  const j = (await res.json()) as { b64: string; mime: string; modelUsed?: string };
  onFrame(`data:${j.mime};base64,${j.b64}`, true, j.modelUsed);
  return j.modelUsed;
}
