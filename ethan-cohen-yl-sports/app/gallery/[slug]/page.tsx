import Header from "@/components/Header";
import GalleryLightbox from "@/components/GalleryLightbox";
import { adminSupabase } from "@/lib/supabase";
import Link from "next/link";
import { tagsFromRelation } from "@/lib/tags";
import { formatGameDate, ogImageUrl } from "@/lib/site";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ slug: string }> };

async function loadGallery(slug: string) {
  const { data } = await adminSupabase()
    .from("galleries")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  return data;
}

function describeGallery(gallery: any, photoCount?: number) {
  const parts: string[] = [];
  if (gallery.sport) parts.push(gallery.sport);
  if (gallery.game_date) parts.push(formatGameDate(gallery.game_date));
  if (gallery.team_home && gallery.team_away) {
    const score =
      gallery.home_score != null && gallery.away_score != null
        ? ` (${gallery.home_score}–${gallery.away_score})`
        : "";
    parts.push(`${gallery.team_home} vs. ${gallery.team_away}${score}`);
  }
  if (photoCount != null) parts.push(`${photoCount} photo${photoCount === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

/** Title, description and cover image for link previews (iMessage, WhatsApp, X, …). */
export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const gallery = await loadGallery(slug);

  if (!gallery) {
    return { title: "Gallery not found", robots: { index: false } };
  }

  const db = adminSupabase();
  const [{ count }, { data: newest }] = await Promise.all([
    db.from("photos").select("id", { count: "exact", head: true }).eq("gallery_id", gallery.id),
    db
      .from("photos")
      .select("display_url")
      .eq("gallery_id", gallery.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const cover = gallery.cover_url || newest?.display_url || null;
  const description =
    describeGallery(gallery, count ?? undefined) || "Yeshiva League sports photography by Ethan Cohen.";
  const images = cover ? [{ url: ogImageUrl(cover), width: 1200, height: 800, alt: gallery.title }] : [];

  return {
    title: gallery.title,
    description,
    alternates: { canonical: `/gallery/${gallery.slug}` },
    openGraph: {
      type: "article",
      title: gallery.title,
      description,
      url: `/gallery/${gallery.slug}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: gallery.title,
      description,
      images: images.map((image) => image.url),
    },
  };
}

export default async function Page({ params }: RouteProps) {
  const { slug } = await params;
  const db = adminSupabase();
  const gallery = await loadGallery(slug);

  if (!gallery) {
    return (
      <>
        <Header />
        <main className="page">
          <h1 className="title">NOT FOUND.</h1>
        </main>
      </>
    );
  }

  const { data: photoRows } = await db
    .from("photos")
    .select("*, photo_tags(tag)")
    .eq("gallery_id", gallery.id)
    .order("taken_at", { ascending: false });

  const photos = (photoRows ?? []).map((photo: any) => ({
    id: photo.id as string,
    display_url: photo.display_url as string,
    caption: (photo.caption ?? null) as string | null,
    tags: tagsFromRelation(photo.photo_tags),
  }));

  return (
    <>
      <Header />

      <main className="page">
        <Link className="back" href="/">
          ← ALL GALLERIES
        </Link>

        <section className="galleryTitle">
          <p className="eyebrow">{gallery.sport?.toUpperCase()}</p>

          <h1 className="title">{gallery.title}</h1>

          <p>
            {gallery.team_home} {gallery.home_score ?? ""} —{" "}
            {gallery.team_away} {gallery.away_score ?? ""}
            {gallery.game_date ? ` · ${gallery.game_date}` : ""}
          </p>
        </section>

        <GalleryLightbox
          photos={photos}
          galleryTitle={gallery.title}
        />
      </main>
    </>
  );
}
