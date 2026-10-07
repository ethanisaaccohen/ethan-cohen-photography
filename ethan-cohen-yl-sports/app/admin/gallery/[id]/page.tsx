import { adminSupabase } from "@/lib/supabase";
import GalleryForm from "@/components/GalleryForm";
import { tagsFromRelation } from "@/lib/tags";

export const dynamic = "force-dynamic";

export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = adminSupabase();

  const { data: gallery } = await db
    .from("galleries")
    .select("*")
    .eq("id", id)
    .single();

  const { data: photoRows } = await db
    .from("photos")
    .select("id, display_url, caption, photo_tags(tag)")
    .eq("gallery_id", id)
    .order("created_at", { ascending: false });

  const photos = (photoRows ?? []).map((photo: any) => ({
    id: photo.id,
    display_url: photo.display_url,
    caption: photo.caption,
    tags: tagsFromRelation(photo.photo_tags),
  }));

  return (
    <main className="page">
      <p className="eyebrow">PRIVATE ADMIN</p>

      <h1 className="title">
        EDIT
        <br />
        <em>GALLERY.</em>
      </h1>

      <GalleryForm
        existing={gallery}
        photos={photos}
      />
    </main>
  );
}
