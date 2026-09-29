import { adminSupabase } from "@/lib/supabase";
import GalleryForm from "@/components/GalleryForm";

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

  const { data: photos } = await db
    .from("photos")
    .select("id, display_url, caption")
    .eq("gallery_id", id)
    .order("created_at", { ascending: false });

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
        photos={photos ?? []}
      />
    </main>
  );
}
