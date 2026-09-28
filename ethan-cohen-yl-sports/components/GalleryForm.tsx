"use client";

import { useState } from "react";

type GalleryFormProps = {
  existing?: any;
};

export default function GalleryForm({ existing }: GalleryFormProps) {
  const [status, setStatus] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving gallery...");

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    const body = {
      ...payload,
      is_public: form.get("is_public") === "on",
      home_score: payload.home_score ? Number(payload.home_score) : null,
      away_score: payload.away_score ? Number(payload.away_score) : null,
    };

    let gallery = existing;

    if (existing) {
      const response = await fetch(`/api/admin/gallery/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const result = await response.json();
        setStatus(result.error || "Could not update this gallery.");
        return;
      }
    } else {
      const response = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      gallery = await response.json();

      if (!response.ok) {
        setStatus(gallery.error || "Could not create this gallery.");
        return;
      }
    }

    if (files?.length) {
      for (const file of Array.from(files)) {
        setStatus(`Uploading ${file.name}...`);

        const signingResponse = await fetch("/api/admin/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            type: file.type,
            galleryId: gallery.id,
          }),
        });

        const signedUpload = await signingResponse.json();

        if (!signingResponse.ok) {
          setStatus(signedUpload.error || `Could not prepare ${file.name}.`);
          return;
        }

        const uploadResponse = await fetch(signedUpload.url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          setStatus(`Could not upload ${file.name}.`);
          return;
        }

        const photoResponse = await fetch(`/api/admin/gallery/${gallery.id}/photo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_url: signedUpload.publicUrl,
            storage_key: signedUpload.key,
            caption: "",
            tags: [],
          }),
        });

        if (!photoResponse.ok) {
          setStatus(`${file.name} uploaded, but could not be saved to the gallery.`);
          return;
        }
      }
    }

    setStatus("Saved successfully. Refresh the admin page to see your gallery.");
  }

  return (
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
        <input name="game_date" type="date" defaultValue={existing?.game_date || ""} />
      </label>

      <label>
        HOME TEAM
        <input name="team_home" defaultValue={existing?.team_home || "Yeshiva League"} />
      </label>

      <label>
        HOME SCORE
        <input name="home_score" type="number" defaultValue={existing?.home_score ?? ""} />
      </label>

      <label>
        AWAY TEAM
        <input name="team_away" defaultValue={existing?.team_away || ""} />
      </label>

      <label>
        AWAY SCORE
        <input name="away_score" type="number" defaultValue={existing?.away_score ?? ""} />
      </label>

      <label>
        <input name="is_public" type="checkbox" defaultChecked={existing?.is_public ?? true} />
        {" "}PUBLIC GALLERY (uncheck for private client proofing)
      </label>

      <label>
        ADD PHOTOS
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => setFiles(event.target.files)}
        />
      </label>

      <button type="submit">SAVE GALLERY →</button>
      {status && <p className="notice">{status}</p>}
    </form>
  );
}
