import Header from "@/components/Header";
import GalleryCard from "@/components/GalleryCard";
import { adminSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = adminSupabase();

  const { data: galleryRows } = await db
    .from("galleries")
    .select(`
      *,
      photos (
        id,
        display_url,
        created_at
      )
    `)
    .eq("is_public", true)
    .order("game_date", { ascending: false });

  const galleries = (galleryRows ?? []).map((gallery: any) => {
    const photos = [...(gallery.photos ?? [])].sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;

      return bDate - aDate;
    });

    return {
      ...gallery,
      cover_url: gallery.cover_url || photos[0]?.display_url || null,
      photo_count: photos.length,
    };
  });

  return (
    <>
      <Header />

      <main>
        <section className="hero">
          <p className="eyebrow">
            YESHIVA LEAGUE · BASEBALL · BASKETBALL · HOCKEY
          </p>

          <h1>
            THE GAME.
            <br />
            <em>FROZEN</em> IN TIME.
          </h1>

          <p className="intro">
            Sports photography by Ethan Cohen — capturing the intensity,
            emotion, and defining moments of Yeshiva League baseball,
            basketball, and hockey.
          </p>

          <a className="explore" href="#galleries">
            EXPLORE THE WORK <strong>↓</strong>
          </a>
        </section>

        <section className="section" id="galleries">
          <div className="sectionhead">
            <span>SELECTED GALLERIES</span>
            <span>{galleries.length} EVENTS</span>
          </div>

          {galleries.length ? (
            <div className="grid">
              {galleries.map((gallery: any) => (
                <GalleryCard key={gallery.id} gallery={gallery} />
              ))}
            </div>
          ) : (
            <div className="empty">NO PUBLIC GALLERIES YET.</div>
          )}
        </section>

        <section className="about" id="about">
          <p className="eyebrow">BEHIND THE LENS</p>

          <h2>
            YESHIVA LEAGUE ATHLETICS,
            <br />
            FROM THE INSIDE.
          </h2>

          <p>
            I’m Ethan Cohen, a high school sports photographer focused on the
            pace, pressure, and personality of Yeshiva League athletics. I
            cover baseball, basketball, and hockey.
          </p>
        </section>
      </main>
    </>
  );
}
