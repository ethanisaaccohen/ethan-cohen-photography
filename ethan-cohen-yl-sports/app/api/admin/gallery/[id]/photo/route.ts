import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase";
import { PHOTO_PREVIEWS_BUCKET } from "@/lib/images";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = (await cookies()).get("ec_admin")?.value;

  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  // Do not publish a photo unless both separately-stored copies exist.
  const db = adminSupabase();
  for (const kind of ["thumbnail", "viewing"] as const) {
    const key = body[`${kind}_storage_key`];
    const url = body[`${kind}_url`];
    if (typeof key !== "string" ||
        !new RegExp(`^${id}/[a-f0-9-]{36}/${kind}\\.jpg$`).test(key) ||
        url !== db.storage.from(PHOTO_PREVIEWS_BUCKET).getPublicUrl(key).data.publicUrl) {
      return NextResponse.json({ error: "Upload the thumbnail and viewing copies before publishing this photo." }, { status: 400 });
    }
    const prefix = key.slice(0, key.lastIndexOf("/"));
    const { data: objects, error: objectError } = await db.storage.from(PHOTO_PREVIEWS_BUCKET).list(prefix);
    if (objectError || !objects?.some((object) => object.name === `${kind}.jpg`)) {
      return NextResponse.json({ error: `The ${kind} copy has not finished uploading.` }, { status: 400 });
    }
  }
  const base = process.env.B2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (typeof body.storage_key !== "string" ||
      !new RegExp(`^galleries/${id}/[a-f0-9-]{36}\\.(jpg|jpeg|png|webp)$`).test(body.storage_key) ||
      !base || body.display_url !== `${base}/${body.storage_key}`) {
    return NextResponse.json({ error: "Invalid original image location." }, { status: 400 });
  }
  const photoData = {
    display_url: body.display_url, storage_key: body.storage_key,
    thumbnail_url: body.thumbnail_url, viewing_url: body.viewing_url,
    thumbnail_storage_key: body.thumbnail_storage_key, viewing_storage_key: body.viewing_storage_key,
    caption: typeof body.caption === "string" ? body.caption.slice(0, 2000) : "",
  };

  const { data, error } = await db
    .from("photos")
    .insert({ ...photoData, gallery_id: id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 200 });
}
