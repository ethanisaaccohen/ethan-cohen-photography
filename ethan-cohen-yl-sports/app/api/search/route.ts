import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase";

type TagRow = {
  photo_id: string;
};

type GalleryRelation = {
  title: string;
  slug: string;
};

type PhotoRow = {
  id: string;
  display_url: string;
  galleries: GalleryRelation | GalleryRelation[] | null;
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json([]);
  }

  const database = adminSupabase();

  const { data: tagRows, error: tagError } = await database
    .from("photo_tags")
    .select("photo_id, tag")
    .ilike("tag", `%${query}%`);

  const tags = tagRows ?? [];

  if (tagError || tags.length === 0) {
    return NextResponse.json([]);
  }

  const photoIds = tags.map((tag: TagRow) => tag.photo_id);

  const { data: photoRows, error: photoError } = await database
    .from("photos")
    .select(
      "id, display_url, gallery_id, galleries!inner(title, slug, is_public)"
    )
    .in("id", photoIds)
    .eq("galleries.is_public", true);

  const photos = (photoRows ?? []) as PhotoRow[];

  if (photoError) {
    return NextResponse.json([]);
  }

  const results = photos.flatMap((photo) => {
    const gallery = Array.isArray(photo.galleries)
      ? photo.galleries[0]
      : photo.galleries;

    if (!gallery) {
      return [];
    }

    return [
      {
        id: photo.id,
        display_url: photo.display_url,
        gallery_title: gallery.title,
        slug: gallery.slug,
      },
    ];
  });

  return NextResponse.json(results);
}
