import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase";
import { parseTags } from "@/lib/tags";

async function requireAdmin() {
  const token = (await cookies()).get("ec_admin")?.value;
  return verifyAdminToken(token);
}

/**
 * Update a single photo.
 * Body: { caption?: string; tags?: string[] | string }
 * Tags, when provided, REPLACE the photo's existing tags.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { photoId } = await params;

  let body: { caption?: unknown; tags?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const update: { caption?: string } = {};

  if (body.caption !== undefined) {
    if (typeof body.caption !== "string") {
      return NextResponse.json(
        { error: "Caption must be text." },
        { status: 400 }
      );
    }

    update.caption = body.caption.trim().slice(0, 500);
  }

  const hasTags = body.tags !== undefined;

  if (Object.keys(update).length === 0 && !hasTags) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const db = adminSupabase();

  // Make sure the photo exists first (also gives us the row to return).
  const { data: existing, error: lookupError } = await db
    .from("photos")
    .select("*")
    .eq("id", photoId)
    .single();

  if (lookupError || !existing) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  let photo = existing;

  if (Object.keys(update).length > 0) {
    const { data, error } = await db
      .from("photos")
      .update(update)
      .eq("id", photoId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    photo = data;
  }

  let tags: string[] | undefined;

  if (hasTags) {
    tags = parseTags(body.tags);

    const { error: deleteError } = await db
      .from("photo_tags")
      .delete()
      .eq("photo_id", photoId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    if (tags.length > 0) {
      const { error: insertError } = await db
        .from("photo_tags")
        .insert(tags.map((tag) => ({ photo_id: photoId, tag })));

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
    }
  } else {
    const { data: tagRows } = await db
      .from("photo_tags")
      .select("tag")
      .eq("photo_id", photoId);

    tags = (tagRows ?? []).map((row: { tag: string }) => row.tag);
  }

  return NextResponse.json({ ...photo, tags }, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { photoId } = await params;

  const { error } = await adminSupabase()
    .from("photos")
    .delete()
    .eq("id", photoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
