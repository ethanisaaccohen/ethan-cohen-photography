import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import sharp from "sharp";
import { verifyAdminToken } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase";
import { PHOTO_PREVIEWS_BUCKET } from "@/lib/images";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminToken((await cookies()).get("ec_admin")?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = adminSupabase();
  const { data: gallery } = await db.from("galleries").select("id").eq("id", id).maybeSingle();
  if (!gallery) return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  if (Number(request.headers.get("content-length")) > 2_600_000) {
    return NextResponse.json({ error: "Preview upload is too large." }, { status: 413 });
  }
  const keys: string[] = [];
  try {
    const form = await request.formData();
    async function validate(name: string, maxSide: number, maxBytes: number) {
      const file = form.get(name);
      if (!(file instanceof File) || file.type !== "image/jpeg" || !file.size || file.size > maxBytes) {
        throw new Error(`A valid small JPEG ${name} is required.`);
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const metadata = await sharp(bytes, { limitInputPixels: 5_000_000 }).metadata();
      if (metadata.format !== "jpeg" || !metadata.width || !metadata.height ||
          Math.max(metadata.width, metadata.height) > maxSide) {
        throw new Error(`${name} must be a resized JPEG, at most ${maxSide}px on its longest side.`);
      }
      return bytes;
    }
    const thumbnail = await validate("thumbnail", 1200, 450_000);
    const viewing = await validate("viewing", 2048, 1_800_000);
    const asset = crypto.randomUUID();
    const urls: Record<string, string> = {};
    for (const [kind, bytes] of [["thumbnail", thumbnail], ["viewing", viewing]] as const) {
      const key = `${id}/${asset}/${kind}.jpg`;
      const { error } = await db.storage.from(PHOTO_PREVIEWS_BUCKET).upload(key, bytes, {
        contentType: "image/jpeg", cacheControl: "31536000", upsert: false,
      });
      if (error) throw new Error(`Could not store ${kind}: ${error.message}`);
      keys.push(key);
      urls[`${kind}_storage_key`] = key;
      urls[`${kind}_url`] = db.storage.from(PHOTO_PREVIEWS_BUCKET).getPublicUrl(key).data.publicUrl;
    }
    return NextResponse.json(urls);
  } catch (error) {
    if (keys.length) await db.storage.from(PHOTO_PREVIEWS_BUCKET).remove(keys);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save image copies." }, { status: 400 });
  }
}
