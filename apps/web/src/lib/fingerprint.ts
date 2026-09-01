// apps/web/src/lib/fingerprint.ts
// Lightweight device fingerprint (§8 fraud signal) — canvas render + UA +
// screen + locale + timezone, hashed with SHA-256. No third-party dependency
// (resolved from the deferred Milestone 2 decision; approved in the M5 plan).
//
// The value is inherently client-computed and spoofable — it is one signal
// among several (IP is captured server-side by create-submission).

function canvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return "no-canvas";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#c9b4fa";
    ctx.fillRect(0, 0, 200, 40);
    ctx.fillStyle = "#1b1938";
    ctx.fillText("WA Marketing BD · fp · ٣٤٥", 2, 2);
    ctx.strokeStyle = "rgba(14,48,48,0.5)";
    ctx.beginPath();
    ctx.arc(50, 20, 15, 0, Math.PI * 2);
    ctx.stroke();
    return canvas.toDataURL();
  } catch {
    return "canvas-error";
  }
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Stable per-browser device fingerprint (64-char lowercase hex). */
export async function getDeviceFingerprint(): Promise<string> {
  const signals = [
    navigator.userAgent,
    navigator.language,
    (navigator.languages ?? []).join(","),
    `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    String(new Date().getTimezoneOffset()),
    canvasFingerprint(),
  ].join("|");
  return sha256Hex(signals);
}
