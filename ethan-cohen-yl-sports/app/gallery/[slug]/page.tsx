import Header from "@/components/Header";
import { adminSupabase } from "@/lib/supabase";
import Link from "next/link";


export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = adminSupabase();

  const { data: gallery } = await db
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

  const { data: photoRows } = await db
    .from("photos")
    .select("*")
    .eq("gallery_id", gallery.id)
    .order("taken_at", { ascending: false });

  const photos = photoRows ?? [];

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

 <div className="photos">
  {photos.map((photo: any) => (
    <figure key={photo.id}>
      <img
        src={photo.display_url}
        alt={photo.caption || gallery.title}
      />

      {photo.caption && (
        <figcaption>{photo.caption}</figcaption>
      )}
    </figure>
  ))}
</div>

      </main>
    </>
  );
}
