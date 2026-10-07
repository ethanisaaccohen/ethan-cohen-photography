import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase";

type GalleryRelation = {
  title: string;
  slug: string;
  sport: string | null;
  is_public: boolean;
};

type PhotoRow = {
  id: string;
  display_url: string;
  caption: string | null;
  gallery_id: string;
  galleries: GalleryRelation | GalleryRelation[] | null;
};

export type SearchResponse = {
  query: string;
  galleries: {
    id: string;
    title: string;
    slug: string;
    sport: string | null;
    game_date: string | null;
    team_home: string | null;
    team_away: string | null;
    photo_count: number;
  }[];
  photos: {
    id: string;
    display_url: string;
    caption: string | null;
    tags: string[];
    gallery_title: string;
    slug: string;
  }[];
};

/** Escape characters that have special meaning in PostgREST `ilike` patterns. */
function likePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 80);

  const empty: SearchResponse = { query: query ?? "", galleries: [], photos: [] };

  if (!query || query.length < 2) {
    return NextResponse.json(empty);
  }

  const db = adminSupabase();
  const pattern = likePattern(query);

  // 1. Galleries whose title or team names match.
  const { data: galleryRows } = await db
    .from("galleries")
    .select("id, title, slug, sport, game_date, team_home, team_away, photos(id)")
    .eq("is_public", true)
    .or(`title.ilike.${pattern},team_home.ilike.${pattern},team_away.ilike.${pattern}`)
    .order("game_date", { ascending: false })
    .limit(20);

  const galleries = (galleryRows ?? []).map((gallery: any) => ({
    id: gallery.id,
    title: gallery.title,
    slug: gallery.slug,
    sport: gallery.sport ?? null,
    game_date: gallery.game_date ?? null,
    team_home: gallery.team_home ?? null,
    team_away: gallery.team_away ?? null,
    photo_count: Array.isArray(gallery.photos) ? gallery.photos.length : 0,
  }));

  // 2. Photos with a matching tag (public galleries only).
  const { data: tagRows } = await db
    .from("photo_tags")
    .select("photo_id, tag")
    .ilike("tag", pattern)
    .limit(500);

  const photoIds = [...new Set((tagRows ?? []).map((row) => row.photo_id))];

  if (photoIds.length === 0) {
    return NextResponse.json({ ...empty, galleries });
  }

  const { data: photoRows } = await db
    .from("photos")
    .select(
      "id, display_url, caption, gallery_id, galleries!inner(title, slug, sport, is_public)"
    )
    .in("id", photoIds.slice(0, 200))
    .eq("galleries.is_public", true)
    .order("taken_at", { ascending: false });

  // All tags for the matched photos (so results can show every tag, not just the match).
  const { data: allTagRows } = await db
    .from("photo_tags")
    .select("photo_id, tag")
    .in("photo_id", photoIds.slice(0, 200));

  const tagsByPhoto = new Map<string, string[]>();

  for (const row of allTagRows ?? []) {
    const list = tagsByPhoto.get(row.photo_id) ?? [];
    list.push(row.tag);
    tagsByPhoto.set(row.photo_id, list);
  }

  const photos = ((photoRows ?? []) as PhotoRow[]).flatMap((photo) => {
    const gallery = Array.isArray(photo.galleries)
      ? photo.galleries[0]
      : photo.galleries;

    if (!gallery) return [];

    return [
      {
        id: photo.id,
        display_url: photo.display_url,
        caption: photo.caption,
        tags: tagsByPhoto.get(photo.id) ?? [],
        gallery_title: gallery.title,
        slug: gallery.slug,
      },
    ];
  });

  return NextResponse.json({ query, galleries, photos } satisfies SearchResponse);
}
