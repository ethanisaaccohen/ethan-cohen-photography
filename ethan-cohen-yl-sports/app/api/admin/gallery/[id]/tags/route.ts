import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase";
import { parseTags } from "@/lib/tags";

/**
 * Add tags to EVERY photo in a gallery (e.g. both team names).
 * Existing tags are kept; duplicates are skipped.
 * Body: { tags: string[] | string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = (await cookies()).get("ec_admin")?.value;

  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { tags?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const tags = parseTags(body.tags);

  if (tags.length === 0) {
    return NextResponse.json({ error: "Enter at least one tag." }, { status: 400 });
  }

  const db = adminSupabase();

  const { data: photos, error: photosError } = await db
    .from("photos")
    .select("id, photo_tags(tag)")
    .eq("gallery_id", id);

  if (photosError) {
    return NextResponse.json({ error: photosError.message }, { status: 400 });
  }

  const rows: { photo_id: string; tag: string }[] = [];

  for (const photo of photos ?? []) {
    const existing = new Set(
      ((photo.photo_tags as { tag: string }[] | null) ?? []).map((row) =>
        row.tag.toLowerCase()
      )
    );

    for (const tag of tags) {
      if (!existing.has(tag.toLowerCase())) {
        rows.push({ photo_id: photo.id, tag });
      }
    }
  }

  if (rows.length > 0) {
    const { error: insertError } = await db.from("photo_tags").insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    added: rows.length,
    photos: (photos ?? []).length,
    tags,
  });
}
