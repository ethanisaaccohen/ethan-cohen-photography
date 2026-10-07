"use client";

import { useState } from "react";
import AdminPhotoManager, { type AdminPhoto as Photo } from "@/components/AdminPhotoManager";

type GalleryFormProps = {
  existing?: any;
  photos?: Photo[];
};

type UploadState = {
  name: string;
  status: "waiting" | "uploading" | "done" | "error";
  error?: string;
};

const CONCURRENT_UPLOADS = 4;

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export default function GalleryForm({
  existing,
  photos = [],
}: GalleryFormProps) {
  const [status, setStatus] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<Photo[]>(photos);

  function updateUpload(index: number, update: Partial<UploadState>) {
    setUploads((current) =>
      current.map((upload, uploadIndex) =>
        uploadIndex === index ? { ...upload, ...update } : upload
      )
    );
  }

  async function uploadOne(file: File, index: number, galleryId: string) {
    updateUpload(index, { status: "uploading", error: undefined });

    try {
      const signingResponse = await fetch("/api/admin/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          type: file.type,
          galleryId,
        }),
      });

      const signedUpload = await readJson(signingResponse);

      if (!signingResponse.ok) {
        throw new Error(signedUpload.error || "Could not prepare upload.");
      }

      if (!signedUpload.url || !signedUpload.publicUrl || !signedUpload.key) {
        throw new Error("Upload authorization returned incomplete data.");
      }

      const uploadResponse = await fetch(signedUpload.url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(
          `Storage upload failed (${uploadResponse.status}).`
        );
      }

      const photoResponse = await fetch(
        `/api/admin/gallery/${galleryId}/photo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            display_url: signedUpload.publicUrl,
            storage_key: signedUpload.key,
            caption: "",
            tags: [],
          }),
        }
      );

      const photoResult = await readJson(photoResponse);

      if (!photoResponse.ok) {
        throw new Error(
          photoResult.error || "Photo record could not be saved."
        );
      }

      setGalleryPhotos((current) => [photoResult, ...current]);

      updateUpload(index, {
        status: "done",
      });
    } catch (error) {
      updateUpload(index, {
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  async function uploadInBatches(photoFiles: File[], galleryId: string) {
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < photoFiles.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        await uploadOne(photoFiles[currentIndex], currentIndex, galleryId);
      }
    }

    const workerCount = Math.min(CONCURRENT_UPLOADS, photoFiles.length);

    await Promise.all(
      Array.from({ length: workerCount }, () => worker())
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setStatus("Saving gallery details...");

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    const body = {
      ...payload,
      is_public: form.get("is_public") === "on",
      home_score: payload.home_score ? Number(payload.home_score) : null,
      away_score: payload.away_score ? Number(payload.away_score) : null,
    };

    let gallery = existing;

    try {
      if (existing) {
        const response = await fetch(`/api/admin/gallery/${existing.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const result = await readJson(response);

        if (!response.ok) {
          throw new Error(result.error || "Could not update this gallery.");
        }

        gallery = result;
      } else {
        const response = await fetch("/api/admin/gallery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const result = await readJson(response);

        if (!response.ok) {
          throw new Error(result.error || "Could not create this gallery.");
        }

        gallery = result;
      }

      if (!gallery?.id) {
        throw new Error("Gallery could not be identified after saving.");
      }

      if (files.length === 0) {
        setStatus("Gallery saved successfully.");
        return;
      }

      setUploads(
        files.map((file) => ({
          name: file.name,
          status: "waiting",
        }))
      );

      setStatus(
        `Uploading ${files.length} photo${files.length === 1 ? "" : "s"}...`
      );

      await uploadInBatches(files, gallery.id);

      setStatus("Uploads finished. Review any files marked as failed below.");
      setFiles([]);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not save this gallery."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const completedCount = uploads.filter(
    (upload) => upload.status === "done"
  ).length;

  const failedCount = uploads.filter(
    (upload) => upload.status === "error"
  ).length;

  return (
    <>
    <form className="form" onSubmit={submit}>
      <label>
        GALLERY TITLE
        <input name="title" required defaultValue={existing?.title || ""} />
      </label>

      <label>
        SPORT
        <select name="sport" defaultValue={existing?.sport || ""} required>
          <option value="">Choose</option>
          <option>Baseball</option>
          <option>Basketball</option>
          <option>Hockey</option>
        </select>
      </label>

      <label>
        DATE
        <input
          name="game_date"
          type="date"
          defaultValue={existing?.game_date || ""}
        />
      </label>

      <label>
        HOME TEAM
        <input
          name="team_home"
          defaultValue={existing?.team_home || "Yeshiva League"}
        />
      </label>

      <label>
        HOME SCORE
        <input
          name="home_score"
          type="number"
          defaultValue={existing?.home_score ?? ""}
        />
      </label>

      <label>
        AWAY TEAM
        <input name="team_away" defaultValue={existing?.team_away || ""} />
      </label>

      <label>
        AWAY SCORE
        <input
          name="away_score"
          type="number"
          defaultValue={existing?.away_score ?? ""}
        />
      </label>

      <label>
        <input
          name="is_public"
          type="checkbox"
          defaultChecked={existing?.is_public ?? true}
        />{" "}
        PUBLIC GALLERY (uncheck for private client proofing)
      </label>

      <label>
        ADD PHOTOS
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={isSaving}
          onChange={(event) => {
            setFiles(Array.from(event.target.files ?? []));
            setUploads([]);
          }}
        />
      </label>

      <button type="submit" disabled={isSaving}>
        {isSaving ? "SAVING…" : "SAVE GALLERY →"}
      </button>

      {status && <p className="notice">{status}</p>}

      {uploads.length > 0 && (
        <div className="upload-status" aria-live="polite">
          <p>
            {completedCount} of {uploads.length} uploaded
            {failedCount ? ` · ${failedCount} failed` : ""}
          </p>

          {uploads.map((upload, index) => (
            <p key={`${upload.name}-${index}`}>
              {upload.status === "done"
                ? "✓"
                : upload.status === "error"
                  ? "✕"
                  : upload.status === "uploading"
                    ? "↑"
                    : "○"}{" "}
              {upload.name}
              {upload.error ? ` — ${upload.error}` : ""}
            </p>
          ))}
        </div>
      )}

    </form>

      {existing && (
        <AdminPhotoManager
          galleryId={existing.id}
          photos={galleryPhotos}
          onChange={setGalleryPhotos}
        />
      )}
    </>
  );
}
