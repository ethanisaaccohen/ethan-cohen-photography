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

export async function POST(request: NextRequest) {
  const token = (await cookies()).get("ec_admin")?.value;

  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const row = sanitizeGalleryInput(body);
  const title = typeof row.title === "string" ? row.title : "";

  if (!title) {
    return NextResponse.json({ error: "A gallery title is required." }, { status: 400 });
  }

  const db = adminSupabase();
  const customSlug = typeof row.slug === "string" ? row.slug : "";
  let slug: string;

  if (customSlug) {
    // Admin typed a URL explicitly: use it, but never silently rename it.
    if (await slugTaken(db, customSlug)) {
      return NextResponse.json({ error: SLUG_TAKEN_MESSAGE }, { status: 409 });
    }
    slug = customSlug;
  } else {
    // Derive from the title and make it unique: "frisch", "frisch-2", "frisch-3", …
    const baseSlug = slugify(title) || "gallery";
    const { data: taken } = await db
      .from("galleries")
      .select("slug")
      .like("slug", `${baseSlug}%`);

    const takenSlugs = new Set((taken ?? []).map((g: { slug: string }) => g.slug));
    slug = baseSlug;
    for (let n = 2; takenSlugs.has(slug); n += 1) slug = `${baseSlug}-${n}`;
  }

  const isPublic = row.is_public !== false;

  const { data, error } = await db
    .from("galleries")
    .insert({
      ...row,
      is_public: isPublic,
      slug,
      proof_token: isPublic ? null : crypto.randomUUID(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: friendlyGalleryError(error.message) },
      { status: 400 }
    );
  }

  return NextResponse.json(data);
}
