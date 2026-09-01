// apps/web/src/lib/cloudinary.ts
// Cloudinary unsigned upload (§6.2) — browser uploads directly with the
// UNSIGNED upload preset; the API secret is never involved client-side.
// Env vars (see .env.example): VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET.

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
}

export class CloudinaryConfigError extends Error {
  constructor() {
    super("Cloudinary is not configured (VITE_CLOUDINARY_* env vars missing)");
  }
}

/** SHA-256 lowercase hex of arbitrary bytes — used for duplicate-screenshot detection (§8). */
export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Uploads an image to Cloudinary with the unsigned preset.
 * Throws CloudinaryConfigError if env vars are missing; Error on upload failure.
 */
export async function uploadScreenshot(file: File): Promise<CloudinaryUploadResult> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;
  if (cloudName === undefined || cloudName === "" || uploadPreset === undefined || uploadPreset === "") {
    throw new CloudinaryConfigError();
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed with status ${String(res.status)}`);
  }
  const data: unknown = await res.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("public_id" in data) ||
    typeof data.public_id !== "string" ||
    !("secure_url" in data) ||
    typeof data.secure_url !== "string"
  ) {
    throw new Error("Cloudinary upload returned an unexpected response");
  }
  return { publicId: data.public_id, url: data.secure_url };
}
