/**
 * Client-side image upload helper.
 *
 * The file is posted to our own /api/upload route, which signs the request and
 * forwards it to Cloudinary. The Cloudinary API secret stays on the server and is
 * never shipped to the browser.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export class UploadError extends Error {}

export async function uploadImage(file: File | Blob, fileName?: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new UploadError("That file isn't an image.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(`Image is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`);
  }

  const body = new FormData();
  body.append("file", file, fileName ?? "question-image.png");

  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body });
  } catch {
    throw new UploadError("Upload failed — check your internet connection.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.url) {
    throw new UploadError(data?.error || `Upload failed (HTTP ${res.status}).`);
  }

  return data.url as string;
}
