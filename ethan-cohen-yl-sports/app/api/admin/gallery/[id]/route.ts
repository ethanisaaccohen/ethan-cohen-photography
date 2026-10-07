import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase";

async function requireAdmin() {
  const token = (await cookies()).get("ec_admin")?.value;
  return verifyAdminToken(token);
}

const TEXT_FIELDS = ["title", "sport", "team_home", "team_away"] as const;
const SCORE_FIELDS = ["home_score", "away_score"] as const;

/**
 * Update gallery details. Only known columns are accepted.
 * Body may include: title, sport, game_date, team_home, team_away,
 * home_score, away_score, is_public, cover_url
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

  const update: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    if (body[field] !== undefined) {
      update[field] = typeof body[field] === "string" ? (body[field] as string).trim() : null;
    }
  }

  for (const field of SCORE_FIELDS) {
    if (body[field] !== undefined) {
      const value = body[field];
      update[field] =
        value === null || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
    }
  }

  if (body.game_date !== undefined) {
    const value = body.game_date;
    update.game_date =
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }

  if (body.is_public !== undefined) {
    update.is_public = Boolean(body.is_public);
  }

  if (body.cover_url !== undefined) {
    update.cover_url =
      typeof body.cover_url === "string" && body.cover_url.startsWith("https://")
        ? body.cover_url
        : null;
  }

  if (update.title === "") {
    return NextResponse.json({ error: "A gallery title is required." }, { status: 400 });
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const db = adminSupabase();

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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 200 });
}
