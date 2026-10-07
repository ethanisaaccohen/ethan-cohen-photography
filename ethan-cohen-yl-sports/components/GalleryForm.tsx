"use client";

import { useEffect, useState, type FormEvent } from "react";
import AdminPhotoManager, { type AdminPhoto as Photo } from "@/components/AdminPhotoManager";
import ShareLinks from "@/components/ShareLinks";
import { slugify } from "@/lib/galleries";
import { uploadPersistentPhoto } from "@/lib/upload-photo";

type GalleryFormProps = { existing?: any; photos?: Photo[] };
type UploadState = { name: string; status: "waiting" | "uploading" | "done" | "error"; error?: string };
const CONCURRENT_UPLOADS = 1;

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

export default function GalleryForm({ existing, photos = [] }: GalleryFormProps) {
  const [status, setStatus] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<Photo[]>(photos);
  const [galleryMeta, setGalleryMeta] = useState<any>(existing ?? null);
  const [slug, setSlug] = useState<string>(existing?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(existing));
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  function updateUpload(index: number, update: Partial<UploadState>) {
    setUploads(current => current.map((upload, i) => i === index ? { ...upload, ...update } : upload));
  }

  async function uploadOne(file: File, index: number, galleryId: string) {
    updateUpload(index, { status: "uploading", error: undefined });
    try {
      const photo = await uploadPersistentPhoto(file, galleryId);
      setGalleryPhotos(current => [photo, ...current]);
      updateUpload(index, { status: "done" });
    } catch (error) {
      updateUpload(index, { status: "error", error: error instanceof Error ? error.message : "Upload failed." });
    }
  }

  async function uploadInBatches(photoFiles: File[], galleryId: string) {
    let nextIndex = 0;
    async function worker() {
      while (nextIndex < photoFiles.length) {
        const index = nextIndex++;
        await uploadOne(photoFiles[index], index, galleryId);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENT_UPLOADS, photoFiles.length) }, () => worker()));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setStatus("Saving gallery details...");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const body = { ...payload, is_public: form.get("is_public") === "on", home_score: payload.home_score ? Number(payload.home_score) : null, away_score: payload.away_score ? Number(payload.away_score) : null };
    let gallery = existing;
    try {
      if (existing) {
        const response = await fetch(`/api/admin/gallery/${existing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const result = await readJson(response);
        if (!response.ok) throw new Error(result.error || "Could not update this gallery.");
        gallery = result;
        setGalleryMeta(result);
        if (result.slug) setSlug(result.slug);
      } else {
        const response = await fetch("/api/admin/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const result = await readJson(response);
        if (!response.ok) throw new Error(result.error || "Could not create this gallery.");
        gallery = result;
      }
      if (!gallery?.id) throw new Error("Gallery could not be identified after saving.");
      if (!files.length) { setStatus("Gallery saved successfully."); return; }
      setUploads(files.map(file => ({ name: file.name, status: "waiting" })));
      setStatus(`Preparing and uploading ${files.length} photo${files.length === 1 ? "" : "s"}, with saved thumbnails and viewing images...`);
      await uploadInBatches(files, gallery.id);
      setStatus("Uploads finished. Review any files marked as failed below.");
      setFiles([]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save this gallery.");
    } finally { setIsSaving(false); }
  }

  const completedCount = uploads.filter(upload => upload.status === "done").length;
  const failedCount = uploads.filter(upload => upload.status === "error").length;

  return (
    <>
      <form className="form" onSubmit={submit}>
        <label>GALLERY TITLE<input name="title" required defaultValue={existing?.title || ""} onChange={event => { if (!slugTouched) setSlug(slugify(event.target.value)); }} /></label>
        <label htmlFor="gallery-slug">GALLERY URL</label>
        <div className="slug-field">
          <span className="slug-prefix">/gallery/</span>
          <input id="gallery-slug" name="slug" className="slug-input" value={slug} placeholder={existing ? "" : "auto-generated from title"} autoComplete="off" spellCheck={false} onChange={event => { setSlugTouched(true); const raw = event.target.value.toLowerCase(); setSlug(raw.replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-/, "")); }} onBlur={() => setSlug(current => slugify(current))} />
        </div>
        <p className="field-hint slug-hint">{slug ? `Public link will be ${origin}/gallery/${slug}` : "Leave empty to generate the URL from the title."}{galleryMeta && slug !== galleryMeta.slug && slug ? " Changing this breaks any links you already shared." : ""}</p>
        <label>SPORT<select name="sport" defaultValue={existing?.sport || ""} required><option value="">Choose</option><option>Baseball</option><option>Basketball</option><option>Hockey</option></select></label>
        <label>DATE<input name="game_date" type="date" defaultValue={existing?.game_date || ""} /></label>
        <label>HOME TEAM<input name="team_home" defaultValue={existing?.team_home || "Yeshiva League"} /></label>
        <label>HOME SCORE<input name="home_score" type="number" defaultValue={existing?.home_score ?? ""} /></label>
        <label>AWAY TEAM<input name="team_away" defaultValue={existing?.team_away || ""} /></label>
        <label>AWAY SCORE<input name="away_score" type="number" defaultValue={existing?.away_score ?? ""} /></label>
        <label><input name="is_public" type="checkbox" defaultChecked={existing?.is_public ?? true} /> PUBLIC GALLERY (uncheck for private client proofing)</label>
        <label>ADD PHOTOS<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={isSaving} onChange={event => { setFiles(Array.from(event.target.files ?? [])); setUploads([]); }} /></label>
        <button type="submit" disabled={isSaving}>{isSaving ? "SAVING…" : "SAVE GALLERY →"}</button>
        {status && <p className="notice">{status}</p>}
        {uploads.length > 0 && <div className="upload-status" aria-live="polite">
          <p>{completedCount} of {uploads.length} uploaded{failedCount ? ` · ${failedCount} failed` : ""}</p>
          {uploads.map((upload, index) => <p key={`${upload.name}-${index}`}>{upload.status === "done" ? "✓" : upload.status === "error" ? "✕" : upload.status === "uploading" ? "↑" : "○"} {upload.name}{upload.error ? ` — ${upload.error}` : ""}</p>)}
        </div>}
      </form>
      {existing && galleryMeta && <ShareLinks slug={galleryMeta.slug} isPublic={Boolean(galleryMeta.is_public)} proofToken={galleryMeta.proof_token ?? null} />}
      {existing && <AdminPhotoManager galleryId={existing.id} initialCoverUrl={existing.cover_url ?? null} photos={galleryPhotos} onChange={setGalleryPhotos} />}
    </>
  );
}
