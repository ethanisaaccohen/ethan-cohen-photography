
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyAdminToken } from "@/lib/auth";
import { adminSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ec_admin")?.value;

  if (!(await verifyAdminToken(token))) {
    redirect("/login");
  }

  const { data } = await adminSupabase()
    .from("galleries")
    .select("*")
    .order("created_at", { ascending: false });

  const galleries = data ?? [];

  return (
    <main className="page">
      <p className="eyebrow">PRIVATE ADMIN DASHBOARD</p>
      <h1 className="title">MANAGE.</h1>
      <p className="intro">
        Normal visitors cannot see this dashboard or upload links.
      </p>

      <Link className="button" href="/admin/new-gallery">
        NEW GALLERY →
      </Link>

      <div style={{ marginTop: 35 }}>
        {galleries.map((gallery: any) => (
          <div className="score" key={gallery.id}>
            <span>
              <b>{gallery.title}</b>
              <br />
              {gallery.sport} · {gallery.is_public ? "PUBLIC" : "PRIVATE"}
            </span>
            <Link className="button" href={`/admin/gallery/${gallery.id}`}>
              EDIT
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
