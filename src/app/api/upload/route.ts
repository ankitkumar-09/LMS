import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Signed Cloudinary upload proxy.
 *
 * The browser posts the image here and this route forwards it to Cloudinary with a
 * signature. The API secret is read server-side only and is never sent to the client,
 * so it must NOT be prefixed with NEXT_PUBLIC_.
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_FOLDER || "testplatform/questions";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function sign(params: Record<string, string>, secret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + secret).digest("hex");
}

export async function POST(req: NextRequest) {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: "Cloudinary is not configured on the server." },
      { status: 500 }
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file was provided." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, WebP or GIF images are allowed." },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 10 MB or smaller." }, { status: 413 });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signed = { folder: FOLDER, timestamp };
  const signature = sign(signed, API_SECRET);

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", API_KEY);
  body.append("timestamp", timestamp);
  body.append("folder", FOLDER);
  body.append("signature", signature);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body,
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Cloudinary." }, { status: 502 });
  }

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.secure_url) {
    console.error("Cloudinary upload failed", res.status, data?.error?.message);
    return NextResponse.json(
      { error: data?.error?.message || "Cloudinary rejected the upload." },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: data.secure_url as string });
}
