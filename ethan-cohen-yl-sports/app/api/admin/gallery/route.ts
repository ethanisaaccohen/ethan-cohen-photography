import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase";
import { friendlyGalleryError, sanitizeGalleryInput, slugify } from "@/lib/galleries";

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
  const baseSlug = slugify(title) || "gallery";

  // Make the slug unique: "frisch", "frisch-2", "frisch-3", …
  const { data: taken } = await db
    .from("galleries")
    .select("slug")
    .like("slug", `${baseSlug}%`);

  const takenSlugs = new Set((taken ?? []).map((g: { slug: string }) => g.slug));
  let slug = baseSlug;
  for (let n = 2; takenSlugs.has(slug); n += 1) slug = `${baseSlug}-${n}`;

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
