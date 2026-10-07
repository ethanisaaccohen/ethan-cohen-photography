import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyAdminToken } from "@/lib/auth";
import GalleryForm from "@/components/GalleryForm";

export const dynamic = "force-dynamic";

export default async function New() {
  const token = (await cookies()).get("ec_admin")?.value;

  if (!(await verifyAdminToken(token))) {
    redirect("/login");
  }

  return (
    <main className="page">
      <p className="eyebrow">
        <Link href="/admin">← ALL GALLERIES</Link>
      </p>
      <h1 className="title">
        NEW
        <br />
        <em>GALLERY.</em>
      </h1>
      <GalleryForm />
    </main>
  );
}
