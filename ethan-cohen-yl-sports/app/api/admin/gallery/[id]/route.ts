import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase";
import {
  SLUG_TAKEN_MESSAGE,
  friendlyGalleryError,
  sanitizeGalleryInput,
  slugTaken,
  slugify,
} from "@/lib/galleries";

async function requireAdmin() {
  const token = (await cookies()).get("ec_admin")?.value;
  return verifyAdminToken(token);
}

/**
 * Update gallery details. Only known columns are accepted.
 * Body may include: title, sport, game_date, team_home, team_away,
 * home_score, away_score, is_public, cover_url, slug
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const update = sanitizeGalleryInput(body);

  if (body.title !== undefined && !update.title) {
    return NextResponse.json({ error: "A gallery title is required." }, { status: 400 });
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const db = adminSupabase();

  // Changing the public URL: must be URL-safe, non-empty and unique.
  if (update.slug !== undefined) {
    let slug = update.slug as string;

    if (!slug) {
      // Empty field → derive it from the (new or current) title.
      let title = typeof update.title === "string" ? update.title : "";
      if (!title) {
        const { data: current } = await db
          .from("galleries")
          .select("title")
          .eq("id", id)
          .single();
        title = current?.title ?? "";
      }
      slug = slugify(title) || "gallery";
    }

    if (await slugTaken(db, slug, id)) {
      return NextResponse.json({ error: SLUG_TAKEN_MESSAGE }, { status: 409 });
    }

    update.slug = slug;
  }

  // A gallery switched to private needs a proofing token so it can be shared.
  if (update.is_public === false) {
    const { data: current } = await db
      .from("galleries")
      .select("proof_token")
      .eq("id", id)
      .single();

    if (current && !current.proof_token) {
      update.proof_token = crypto.randomUUID();
    }
  }

  const { data, error } = await db
    .from("galleries")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: friendlyGalleryError(error.message) },
      { status: 400 }
    );
  }

  return NextResponse.json(data, { status: 200 });
}

/** Delete a gallery and (via ON DELETE CASCADE) its photo records, tags and favorites. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await adminSupabase()
    .from("galleries")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
