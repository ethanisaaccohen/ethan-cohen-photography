import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase";

async function requireAdmin() {
  const token = (await cookies()).get("ec_admin")?.value;
  return verifyAdminToken(token);
}

/**
 * Update a single photo. Currently supports editing the caption.
 * Body: { caption?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { photoId } = await params;

  let body: { caption?: unknown };

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

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await adminSupabase()
    .from("photos")
    .update(update)
    .eq("id", photoId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 200 });
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
