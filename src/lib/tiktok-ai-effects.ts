/**
 * TikTok AI Effects Module
 * Visual effects, audio effects, transitions, and caption rendering
 * for the StudioAITube video assembler.
 */

import type { CaptionSegment } from "@/lib/ai-client";

// ── Visual Effect Types ──

export type VisualEffect = "none" | "glitch" | "vhs" | "paranormal" | "noir" | "red-tint" | "film-grain" | "shadow-pulse";

export const VISUAL_EFFECTS: { id: VisualEffect; label: string; desc: string; emoji: string }[] = [
  { id: "none", label: "Sem efeito", desc: "Visual limpo padrão", emoji: "🎞️" },
  { id: "glitch", label: "Glitch Digital", desc: "Distorção digital aleatória", emoji: "📺" },
  { id: "vhs", label: "VHS Retro", desc: "Estética VHS anos 80/90", emoji: "📼" },
  { id: "paranormal", label: "Paranormal", desc: "Tremor e distorção sobrenatural", emoji: "👻" },
  { id: "noir", label: "Noir Escuro", desc: "Preto e branco contrastado", emoji: "🌑" },
  { id: "red-tint", label: "Vermelho Sombrio", desc: "Tonalidade vermelha intensa", emoji: "🩸" },
  { id: "film-grain", label: "Grão de Filme", desc: "Textura de filme analógico", emoji: "🎞️" },
  { id: "shadow-pulse", label: "Pulso de Sombra", desc: "Pulsação de escuridão rítmica", emoji: "👁️" },
];

export type TransitionEffect = "none" | "fade" | "glitch-cut" | "flash" | "distortion" | "whisper";

export const TRANSITION_EFFECTS: { id: TransitionEffect; label: string; desc: string; emoji: string }[] = [
  { id: "none", label: "Corte seco", desc: "Sem transição", emoji: "✂️" },
  { id: "fade", label: "Fade", desc: "Esmaecimento suave", emoji: "🌑" },
  { id: "glitch-cut", label: "Glitch Cut", desc: "Corte com glitch", emoji: "📺" },
  { id: "flash", label: "Flash Branco", desc: "Flash de luz rápida", emoji: "⚡" },
  { id: "distortion", label: "Distortion", desc: "Distorção de onda", emoji: "🌊" },
  { id: "whisper", label: "Whisper", desc: "Desfocagem + aparecimento", emoji: "💨" },
];

export type VoiceEffect = "none" | "echo" | "reverb" | "deep" | "whisper-voice" | "radio";

export const VOICE_EFFECTS: { id: VoiceEffect; label: string; desc: string; emoji: string }[] = [
  { id: "none", label: "Sem efeito", desc: "Voz natural", emoji: "🎙️" },
  { id: "echo", label: "Eco Sombrio", desc: "Eco com decay longo", emoji: "📢" },
  { id: "reverb", label: "Reverb", desc: "Reverberação de caverna", emoji: "🕳️" },
  { id: "deep", label: "Mais Grave", desc: "Pitch down assustador", emoji: "👹" },
  { id: "whisper-voice", label: "Sussurro", desc: "Voz sussurrada fantasmagórica", emoji: "👻" },
  { id: "radio", label: "Rádio Antigo", desc: "Efeito de rádio estático", emoji: "📻" },
];

export type CaptionStyle = "none" | "tiktok" | "cinematic" | "karaoke" | "glitch-text";

export const CAPTION_STYLES: { id: CaptionStyle; label: string; desc: string; emoji: string }[] = [
  { id: "none", label: "Sem legenda", desc: "Não mostrar legendas", emoji: "🚫" },
  { id: "tiktok", label: "TikTok Style", desc: "Fundo preto + texto branco bold", emoji: "🎵" },
  { id: "cinematic", label: "Cinematográfico", desc: "Texto branco com sombra sutil", emoji: "🎬" },
  { id: "karaoke", label: "Karaokê", desc: "Palavra atual destacada em cor", emoji: "🎤" },
  { id: "glitch-text", label: "Glitch Texto", desc: "Texto com efeito glitch", emoji: "📺" },
];

export type MusicMood = "dark-suspense" | "horror-ambient" | "true-crime" | "paranormal" | "occult-ritual" | "deep-mystery";

export const MUSIC_MOODS: { id: MusicMood; label: string; prompt: string; emoji: string }[] = [
  { id: "dark-suspense", label: "Suspense Sombrio", prompt: "dark suspenseful cinematic background music, tension building, eerie atmosphere", emoji: "🌑" },
  { id: "horror-ambient", label: "Horror Ambiente", prompt: "dark horror ambient soundscape, creepy atmosphere, unsettling drones, dissonant strings", emoji: "👻" },
  { id: "true-crime", label: "True Crime", prompt: "true crime investigation music, mysterious piano, dark orchestral, documentary style", emoji: "🔍" },
  { id: "paranormal", label: "Paranormal", prompt: "paranormal supernatural music, ghostly whispers, ethereal pads, otherworldly atmosphere", emoji: "👁️" },
  { id: "occult-ritual", label: "Oculto/Ritual", prompt: "dark occult ritual music, deep drums, chanting ambient, dark meditation, ominous", emoji: "🕯️" },
  { id: "deep-mystery", label: "Mistério Profundo", prompt: "deep mystery music, slow orchestral build, dark strings, enigmatic atmosphere", emoji: "🧩" },
];

// ── TikTok AI Options ──

export type TikTokAIOptions = {
  captions: {
    enabled: boolean;
    style: CaptionStyle;
    segments: CaptionSegment[];
  };
  music: {
    enabled: boolean;
    audioUrl: string | null;
    volume: number; // 0..1
    mood: MusicMood;
  };
  visualEffect: VisualEffect;
  voiceEffect: VoiceEffect;
  transition: TransitionEffect;
};

export const DEFAULT_TIKTOK_AI: TikTokAIOptions = {
  captions: { enabled: false, style: "tiktok", segments: [] },
  music: { enabled: false, audioUrl: null, volume: 0.15, mood: "dark-suspense" },
  visualEffect: "none",
  voiceEffect: "none",
  transition: "none",
};

// ── Visual Effect Renderers ──

/** Apply a visual effect overlay on the canvas after the main image is drawn */
export function applyVisualEffect(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number, // 0..1 scene progress
  frame: number,
  effect: VisualEffect,
) {
  if (effect === "none") return;

  switch (effect) {
    case "glitch":
      renderGlitch(ctx, W, H, t, frame);
      break;
    case "vhs":
      renderVHS(ctx, W, H, t, frame);
      break;
    case "paranormal":
      renderParanormal(ctx, W, H, t, frame);
      break;
    case "noir":
      renderNoir(ctx, W, H);
      break;
    case "red-tint":
      renderRedTint(ctx, W, H, t);
      break;
    case "film-grain":
      renderFilmGrain(ctx, W, H, frame);
      break;
    case "shadow-pulse":
      renderShadowPulse(ctx, W, H, t);
      break;
  }
}

function renderGlitch(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, frame: number) {
  // Random glitch bars
  const glitchIntensity = Math.random() > 0.85 ? 0.8 : 0.15;
  const numBars = Math.floor(Math.random() * 8 * glitchIntensity) + 1;
  for (let i = 0; i < numBars; i++) {
    const y = Math.random() * H;
    const barH = Math.random() * 20 + 2;
    const offset = (Math.random() - 0.5) * 40 * glitchIntensity;
    try {
      const imgData = ctx.getImageData(0, Math.max(0, Math.floor(y)), W, Math.min(Math.ceil(barH), Math.floor(H - y)));
      ctx.putImageData(imgData, offset, Math.floor(y));
    } catch { /* cross-origin safety */ }
  }
  // RGB shift
  if (Math.random() > 0.7) {
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(255, 0, 0, ${0.03 * glitchIntensity})`;
    ctx.fillRect(2, 0, W, H);
    ctx.fillStyle = `rgba(0, 255, 255, ${0.03 * glitchIntensity})`;
    ctx.fillRect(-2, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }
  // Scanline
  ctx.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.02})`;
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }
}

function renderVHS(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, frame: number) {
  // Tracking lines
  const trackingY = ((frame * 0.3) % (H + 40)) - 20;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, trackingY, W, 3);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(0, trackingY + 6, W, 8);

  // Bottom tracking noise
  if (Math.random() > 0.9) {
    const noiseH = Math.random() * 30 + 5;
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
    ctx.fillRect(0, H - noiseH, W, noiseH);
  }

  // Color bleed
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(255, 0, 80, 0.04)";
  ctx.fillRect(1, 0, W, H);
  ctx.fillStyle = "rgba(0, 80, 255, 0.03)";
  ctx.fillRect(-1, 0, W, H);
  ctx.globalCompositeOperation = "source-over";

  // Scanlines
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let y = 0; y < H; y += 2) {
    ctx.fillRect(0, y, W, 1);
  }

  // Vignette heavy
  const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Date stamp
  ctx.font = "14px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  const d = new Date(2024, 10, 13 + Math.floor(Math.random() * 3));
  ctx.fillText(`REC ${d.toLocaleDateString("pt-BR")}`, 20, H - 20);
}

function renderParanormal(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, frame: number) {
  // Shaking
  const shakeX = (Math.random() - 0.5) * 4 * (Math.sin(t * Math.PI * 8) * 0.5 + 0.5);
  const shakeY = (Math.random() - 0.5) * 3 * (Math.sin(t * Math.PI * 6) * 0.5 + 0.5);
  try {
    const imgData = ctx.getImageData(0, 0, W, H);
    ctx.putImageData(imgData, shakeX, shakeY);
  } catch { /* cross-origin */ }

  // Flickering brightness
  const flicker = 0.7 + Math.random() * 0.3;
  ctx.fillStyle = `rgba(0,0,0,${1 - flicker})`;
  ctx.fillRect(0, 0, W, H);

  // Eerie blue tint
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = "rgba(50, 0, 80, 0.08)";
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";

  // Random apparition flash
  if (Math.random() > 0.97) {
    ctx.fillStyle = `rgba(200,200,255,${Math.random() * 0.1})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function renderNoir(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Desaturate by overlaying semi-transparent grayscale
  ctx.globalCompositeOperation = "saturation";
  ctx.fillStyle = "rgba(128,128,128,1)";
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";

  // High contrast
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";

  // Vignette
  const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.65);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function renderRedTint(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // Pulsating red overlay
  const pulse = 0.1 + Math.sin(t * Math.PI * 4) * 0.05;
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = `rgba(180, 40, 40, ${pulse})`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";

  // Red vignette
  const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(100,0,0,0.4)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function renderFilmGrain(ctx: CanvasRenderingContext2D, W: number, H: number, frame: number) {
  // Static grain
  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;
  const grainAmount = 15;
  // Only process every other pixel for performance
  for (let i = 0; i < data.length; i += 8) {
    const grain = (Math.random() - 0.5) * grainAmount;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);
}

function renderShadowPulse(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const pulse = Math.sin(t * Math.PI * 6) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(0, 0, 0, ${pulse * 0.25})`;
  ctx.fillRect(0, 0, W, H);

  // Edge shadows that pulse
  const edgeSize = 80 + pulse * 40;
  // Top
  const gt = ctx.createLinearGradient(0, 0, 0, edgeSize);
  gt.addColorStop(0, `rgba(0,0,0,${0.3 + pulse * 0.2})`);
  gt.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gt;
  ctx.fillRect(0, 0, W, edgeSize);
  // Bottom
  const gb = ctx.createLinearGradient(0, H, 0, H - edgeSize);
  gb.addColorStop(0, `rgba(0,0,0,${0.3 + pulse * 0.2})`);
  gb.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gb;
  ctx.fillRect(0, H - edgeSize, W, edgeSize);
}

// ── Caption Renderers ──

export function renderCaption(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  currentTime: number, // seconds into the scene
  segments: CaptionSegment[],
  style: CaptionStyle,
  frame: number,
) {
  if (style === "none" || !segments.length) return;

  // Find active segment
  let activeSeg: CaptionSegment | null = null;
  let segProgress = 0;
  for (const seg of segments) {
    if (currentTime >= seg.start && currentTime <= seg.end) {
      activeSeg = seg;
      segProgress = (currentTime - seg.start) / (seg.end - seg.start || 1);
      break;
    }
  }
  if (!activeSeg) return;

  const text = activeSeg.text.trim();
  if (!text) return;

  switch (style) {
    case "tiktok":
      renderTikTokCaption(ctx, W, H, text);
      break;
    case "cinematic":
      renderCinematicCaption(ctx, W, H, text);
      break;
    case "karaoke":
      renderKaraokeCaption(ctx, W, H, text, segProgress, activeSeg, currentTime);
      break;
    case "glitch-text":
      renderGlitchCaption(ctx, W, H, text, frame);
      break;
  }
}

function renderTikTokCaption(ctx: CanvasRenderingContext2D, W: number, H: number, text: string) {
  const fontSize = Math.min(32, W * 0.035);
  ctx.font = `bold ${fontSize}px 'Arial Black', 'Impact', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapText(ctx, text, W * 0.85);
  const lineHeight = fontSize * 1.4;
  const totalH = lines.length * lineHeight;
  const startY = H * 0.82 - totalH / 2;

  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight + lineHeight / 2;
    const metrics = ctx.measureText(lines[i]);
    const tw = metrics.width;
    const px = 16;
    const py = 6;

    // Black rounded background
    const rx = W / 2 - tw / 2 - px;
    const ry = y - fontSize / 2 - py;
    const rw = tw + px * 2;
    const rh = fontSize + py * 2;
    const radius = 8;
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    roundRect(ctx, rx, ry, rw, rh, radius);
    ctx.fill();

    // White text
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(lines[i], W / 2, y);
  }
}

function renderCinematicCaption(ctx: CanvasRenderingContext2D, W: number, H: number, text: string) {
  const fontSize = Math.min(26, W * 0.028);
  ctx.font = `${fontSize}px 'Georgia', 'Times New Roman', serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapText(ctx, text, W * 0.8);
  const lineHeight = fontSize * 1.5;
  const totalH = lines.length * lineHeight;
  const startY = H * 0.85 - totalH / 2;

  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight + lineHeight / 2;

    // Shadow
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(lines[i], W / 2, y);

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

function renderKaraokeCaption(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  text: string,
  progress: number,
  seg: CaptionSegment,
  currentTime: number,
) {
  const fontSize = Math.min(30, W * 0.032);
  ctx.font = `bold ${fontSize}px 'Arial', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const y = H * 0.82;
  const words = text.split(" ");

  // Calculate which words are "spoken" based on word-level timing or progress
  const wordsSpoken = Math.floor(progress * words.length);
  const fullText = words.join(" ");
  const spokenText = words.slice(0, wordsSpoken + 1).join(" ");

  // Draw all words in dim white
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText(fullText, W / 2, y);

  // Draw spoken words in bright primary color on top
  ctx.fillStyle = "#a78bfa"; // primary purple
  // Measure the spoken portion width
  const fullWidth = ctx.measureText(fullText).width;
  const spokenWidth = ctx.measureText(spokenText).width;
  const startX = W / 2 - fullWidth / 2;

  // Use clipping to highlight only the spoken portion
  ctx.save();
  ctx.beginPath();
  ctx.rect(startX, y - fontSize, spokenWidth, fontSize * 2);
  ctx.clip();
  ctx.fillStyle = "#a78bfa";
  ctx.fillText(fullText, W / 2, y);
  ctx.restore();

  // Background bar
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  const barW = fullWidth + 40;
  roundRect(ctx, W / 2 - barW / 2, y - fontSize / 2 - 8, barW, fontSize + 16, 10);
  ctx.fill();

  // Re-draw text on top of background
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText(fullText, W / 2, y);
  ctx.save();
  ctx.beginPath();
  ctx.rect(startX, y - fontSize, spokenWidth, fontSize * 2);
  ctx.clip();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(fullText, W / 2, y);
  ctx.restore();
}

function renderGlitchCaption(ctx: CanvasRenderingContext2D, W: number, H: number, text: string, frame: number) {
  const fontSize = Math.min(30, W * 0.032);
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const y = H * 0.82;
  const glitchOffset = (Math.random() - 0.5) * 6;

  // Red channel offset
  ctx.fillStyle = "rgba(255,0,0,0.7)";
  ctx.fillText(text, W / 2 + glitchOffset - 2, y - 1);

  // Cyan channel offset
  ctx.fillStyle = "rgba(0,255,255,0.7)";
  ctx.fillText(text, W / 2 + glitchOffset + 2, y + 1);

  // Main white text
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(text, W / 2 + glitchOffset, y);

  // Random glitch bar through text
  if (Math.random() > 0.7) {
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(0, y - fontSize / 2 + Math.random() * fontSize, W, 2);
  }
}

// ── Audio Effect Processors (Web Audio API) ──

export function applyVoiceEffect(
  audioCtx: AudioContext,
  sourceNode: AudioNode,
  effect: VoiceEffect,
): { chain: AudioNode; destination: AudioNode } {
  if (effect === "none") {
    return { chain: sourceNode, destination: audioCtx.destination };
  }

  const dest = audioCtx.createMediaStreamDestination();
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 1.0;

  switch (effect) {
    case "echo": {
      const delay = audioCtx.createDelay(1.0);
      delay.delayTime.value = 0.3;
      const feedback = audioCtx.createGain();
      feedback.gain.value = 0.5;
      const wetGain = audioCtx.createGain();
      wetGain.gain.value = 0.4;

      sourceNode.connect(gainNode);
      gainNode.connect(dest);
      gainNode.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wetGain);
      wetGain.connect(dest);
      gainNode.connect(audioCtx.destination);
      return { chain: gainNode, destination: dest };
    }
    case "reverb": {
      // Create convolution reverb (synthetic impulse response)
      const convolver = audioCtx.createConvolver();
      const sampleRate = audioCtx.sampleRate;
      const length = sampleRate * 2;
      const impulse = audioCtx.createBuffer(2, length, sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
        }
      }
      convolver.buffer = impulse;

      const wetGain = audioCtx.createGain();
      wetGain.gain.value = 0.35;

      sourceNode.connect(gainNode);
      gainNode.connect(dest);
      gainNode.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(dest);
      gainNode.connect(audioCtx.destination);
      return { chain: gainNode, destination: dest };
    }
    case "deep": {
      // Pitch down by playing slower — approximate with a simple lowpass
      const filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2000;
      filter.Q.value = 1;

      sourceNode.connect(gainNode);
      gainNode.connect(filter);
      filter.connect(dest);
      gainNode.connect(audioCtx.destination);
      return { chain: gainNode, destination: dest };
    }
    case "whisper-voice": {
      // Bandpass for whispery effect
      const bp = audioCtx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 3000;
      bp.Q.value = 0.5;

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.value = 0.1;

      sourceNode.connect(gainNode);
      gainNode.connect(bp);
      bp.connect(noiseGain);
      noiseGain.connect(dest);
      gainNode.connect(audioCtx.destination);
      return { chain: gainNode, destination: dest };
    }
    case "radio": {
      // Bandpass + distortion
      const bp = audioCtx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2500;
      bp.Q.value = 3;

      const distortion = audioCtx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = (Math.PI + 3) * x / (Math.PI + 3 * Math.abs(x));
      }
      distortion.curve = curve;

      sourceNode.connect(gainNode);
      gainNode.connect(bp);
      bp.connect(distortion);
      distortion.connect(dest);
      gainNode.connect(audioCtx.destination);
      return { chain: gainNode, destination: dest };
    }
    default:
      sourceNode.connect(dest);
      sourceNode.connect(audioCtx.destination);
      return { chain: sourceNode, destination: dest };
  }
}

// ── Transition Renderers ──

export interface TransitionFrame {
  type: TransitionEffect;
  duration: number; // in seconds
}

/** Render transition overlay. Returns true if transition is still active. */
export function renderTransition(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number, // 0..1 progress within transition
  transition: TransitionEffect,
  nextImg?: HTMLImageElement,
  nextStyleIndex?: number,
): boolean {
  if (transition === "none" || t >= 1) return false;

  switch (transition) {
    case "fade":
      ctx.fillStyle = `rgba(0,0,0,${t})`;
      ctx.fillRect(0, 0, W, H);
      if (t > 0.5 && nextImg) {
        ctx.globalAlpha = (t - 0.5) * 2;
        ctx.drawImage(nextImg, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      return true;

    case "glitch-cut": {
      // Rapid glitch frames
      const numSlices = Math.floor(10 + t * 20);
      for (let i = 0; i < numSlices; i++) {
        const y = Math.random() * H;
        const h = Math.random() * 30 + 5;
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "139,92,246" : "255,255,255"}, ${0.1 + Math.random() * 0.2})`;
        ctx.fillRect((Math.random() - 0.5) * 20, y, W, h);
      }
      return true;
    }

    case "flash": {
      // White flash that fades
      const flashIntensity = t < 0.3 ? t / 0.3 : 1 - ((t - 0.3) / 0.7);
      ctx.fillStyle = `rgba(255,255,255,${flashIntensity * 0.9})`;
      ctx.fillRect(0, 0, W, H);
      return true;
    }

    case "distortion": {
      // Wave distortion effect
      try {
        const imgData = ctx.getImageData(0, 0, W, H);
        const copy = new ImageData(new Uint8ClampedArray(imgData.data), W, H);
        const intensity = Math.sin(t * Math.PI) * 15;
        for (let y = 0; y < H; y++) {
          const offsetX = Math.sin(y * 0.02 + t * 20) * intensity;
          const srcY = Math.min(H - 1, Math.max(0, y));
          const dstY = Math.min(H - 1, Math.max(0, y));
          for (let x = 0; x < W; x++) {
            const srcX = Math.min(W - 1, Math.max(0, Math.floor(x + offsetX)));
            const dstIdx = (dstY * W + x) * 4;
            const srcIdx = (srcY * W + srcX) * 4;
            copy.data[dstIdx] = imgData.data[srcIdx];
            copy.data[dstIdx + 1] = imgData.data[srcIdx + 1];
            copy.data[dstIdx + 2] = imgData.data[srcIdx + 2];
          }
        }
        ctx.putImageData(copy, 0, 0);
      } catch { /* cross-origin */ }
      return true;
    }

    case "whisper": {
      // Blur-like fade: darken + lighten
      const darken = t < 0.5 ? t * 2 : 2 - t * 2;
      ctx.fillStyle = `rgba(0,0,0,${darken * 0.7})`;
      ctx.fillRect(0, 0, W, H);
      if (t > 0.4 && nextImg) {
        const alpha = (t - 0.4) / 0.6;
        ctx.globalAlpha = alpha * 0.5;
        ctx.drawImage(nextImg, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      return true;
    }

    default:
      return false;
  }
}

// ── Utility Functions ──

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3); // Max 3 lines
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}