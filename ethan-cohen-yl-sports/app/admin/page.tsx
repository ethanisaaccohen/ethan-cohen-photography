import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyAdminToken } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase";
import AdminGalleryList, { type AdminGallery } from "@/components/AdminGalleryList";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ec_admin")?.value;

  if (!(await verifyAdminToken(token))) {
    redirect("/login");
  }

  const { data } = await adminSupabase()
    .from("galleries")
    .select("*, photos(id, display_url, created_at), favorite_submissions(id)")
    .order("created_at", { ascending: false });

  const galleries: AdminGallery[] = (data ?? []).map((gallery: any) => {
    const photos = [...(gallery.photos ?? [])].sort(
      (a: any, b: any) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    );

    return {
      id: gallery.id,
      title: gallery.title,
      slug: gallery.slug,
      sport: gallery.sport ?? null,
      game_date: gallery.game_date ?? null,
      team_home: gallery.team_home ?? null,
      team_away: gallery.team_away ?? null,
      is_public: Boolean(gallery.is_public),
      cover_url: gallery.cover_url || photos[0]?.display_url || null,
      photo_count: photos.length,
      favorites_count: (gallery.favorite_submissions ?? []).length,
    };
  });

  const totalPhotos = galleries.reduce((sum, g) => sum + g.photo_count, 0);

  return (
    <main className="page">
      <div className="admin-topbar">
        <p className="eyebrow">PRIVATE ADMIN DASHBOARD</p>
        <LogoutButton />
      </div>

      <h1 className="title">MANAGE.</h1>
      <p className="intro">
        {galleries.length} galler{galleries.length === 1 ? "y" : "ies"} ·{" "}
        {totalPhotos} photo{totalPhotos === 1 ? "" : "s"}. Normal visitors
        cannot see this dashboard or upload links.
      </p>

      <div className="admin-actions">
        <Link className="button" href="/admin/new-gallery">
          NEW GALLERY →
        </Link>
        <Link className="button secondary" href="/" target="_blank">
          VIEW SITE ↗
        </Link>
      </div>

      <div style={{ marginTop: 35 }}>
        <AdminGalleryList galleries={galleries} />
      </div>
    </main>
  );
}
