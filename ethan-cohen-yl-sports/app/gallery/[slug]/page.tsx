import Header from "@/components/Header";
import { adminSupabase } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Gallery = {
  id: string;
  title: string;
  sport: string | null;
  team_home: string | null;
  home_score: number | string | null;
  team_away: string | null;
  away_score: number | string | null;
  game_date: string | null;
};

type Photo = {
  id: string;
  display_url: string;
  caption: string | null;
};

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const database = adminSupabase();

  const { data: gallery } = await database
    .from("galleries")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

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

  const typedGallery = gallery as Gallery;

  const { data: photoRows } = await database
    .from("photos")
    .select("*")
    .eq("gallery_id", typedGallery.id)
    .order("taken_at", { ascending: false });

  const photos = (photoRows ?? []) as Photo[];

  return (
    <>
      <Header />

      <main className="page">
        <Link className="back" href="/">
          ← ALL GALLERIES
        </Link>

        <section className="galleryTitle">
          <p className="eyebrow">{typedGallery.sport?.toUpperCase()}</p>

          <h1 className="title">{typedGallery.title}</h1>

          <p>
            {typedGallery.team_home} {typedGallery.home_score ?? ""} —{" "}
            {typedGallery.team_away} {typedGallery.away_score ?? ""}
            {typedGallery.game_date ? ` · ${typedGallery.game_date}` : ""}
          </p>
        </section>

        <div className="photos">
          {photos.map((photo) => (
            <figure key={photo.id}>
              <img
                src={photo.display_url}
                alt={photo.caption ||
