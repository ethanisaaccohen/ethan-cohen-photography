import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifyAdminToken } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase";
import Link from "next/link";
import GalleryForm from "@/components/GalleryForm";
import FavoritesPanel, { type FavoriteSubmission } from "@/components/FavoritesPanel";
import { tagsFromRelation } from "@/lib/tags";

export const dynamic = "force-dynamic";

export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const token = (await cookies()).get("ec_admin")?.value;

  if (!(await verifyAdminToken(token))) {
    redirect("/login");
  }

  const { id } = await params;
  const db = adminSupabase();

  const { data: gallery } = await db
    .from("galleries")
    .select("*")
    .eq("id", id)
    .single();

  if (!gallery) notFound();

  const { data: photoRows } = await db
    .from("photos")
    .select("id, display_url, thumbnail_url, viewing_url, caption, photo_tags(tag)")
    .eq("gallery_id", id)
    .order("created_at", { ascending: false });

  const photos = (photoRows ?? []).map((photo: any) => ({
    id: photo.id,
    display_url: photo.display_url,
    thumbnail_url: photo.thumbnail_url,
    viewing_url: photo.viewing_url,
    caption: photo.caption,
    tags: tagsFromRelation(photo.photo_tags),
  }));

  const { data: submissionRows } = await db
    .from("favorite_submissions")
    .select("id, name, email, created_at, favorite_items(photo_id)")
    .eq("gallery_id", id)
    .order("created_at", { ascending: false });

  const photoById = new Map(photos.map((photo) => [photo.id, photo]));

  const submissions: FavoriteSubmission[] = (submissionRows ?? []).map((row: any) => {
    const ids: string[] = (row.favorite_items ?? []).map((item: any) => item.photo_id);
    const found = ids.map((photoId) => photoById.get(photoId)).filter(Boolean);

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      created_at: row.created_at ?? null,
      photos: found.map((photo: any) => ({
        id: photo.id,
        display_url: photo.display_url,
        thumbnail_url: photo.thumbnail_url,
        caption: photo.caption ?? null,
      })),
      missing: ids.length - found.length,
    };
  });

  return (
    <main className="page">
      <p className="eyebrow">
        <Link href="/admin">← ALL GALLERIES</Link>
      </p>

      <h1 className="title">
        EDIT
        <br />
        <em>GALLERY.</em>
      </h1>

      <GalleryForm
        existing={gallery}
        photos={photos}
      />

      {(!gallery.is_public || submissions.length > 0) && (
        <FavoritesPanel submissions={submissions} />
      )}
    </main>
  );
}
