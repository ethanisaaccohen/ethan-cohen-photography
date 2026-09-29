import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase";

type PhotoRequestBody = {
  display_url?: unknown;
  storage_key?: unknown;
  caption?: unknown;
  tags?: unknown;
};

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [
    ...new Set(
      tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    ),
  ];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminToken = (await cookies()).get("ec_admin")?.value;
  const isAdmin = await verifyAdminToken(adminToken);

  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: galleryId } = await params;

  try {
    const body = (await request.json()) as PhotoRequestBody;

    const displayUrl =
      typeof body.display_url === "string" ? body.display_url : "";

    const storageKey =
      typeof body.storage_key === "string" ? body.storage_key : "";

    const caption =
      typeof body.caption === "string" ? body.caption.trim() : "";

    const tags = normalizeTags(body.tags);

    if (!displayUrl || !storageKey) {
      return NextResponse.json(
        { error: "display_url and storage_key
