"use client";

import { useState } from "react";
import { smallThumb } from "@/lib/images";

export type AdminPhoto = {
  id: string;
  display_url: string;
  caption?: string | null;
};

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

type Props = {
  photos: AdminPhoto[];
  onChange: (photos: AdminPhoto[]) => void;
  onStatus: (message: string) => void;
};

export default function AdminPhotoManager({
  photos,
  onChange,
  onStatus,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function deletePhoto(photo: AdminPhoto) {
    const confirmed = window.confirm(
      "Delete this photo from the gallery? This cannot be undone."
    );

    if (!confirmed) return;

    setBusyId(photo.id);
    onStatus("");

    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: "DELETE",
      });

      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(result.error || "Could not delete this photo.");
      }

      onChange(photos.filter((current) => current.id !== photo.id));
      onStatus("Photo removed from this gallery.");
    } catch (error) {
      onStatus(
        error instanceof Error ? error.message : "Could not delete this photo."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function saveCaption(photo: AdminPhoto, caption: string) {
    setBusyId(photo.id);
    onStatus("");

    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      });

      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(result.error || "Could not save the caption.");
      }

      onChange(
        photos.map((current) =>
          current.id === photo.id
            ? { ...current, caption: result.caption ?? caption }
            : current
        )
      );
      onStatus("Caption saved.");
    } catch (error) {
      onStatus(
        error instanceof Error ? error.message : "Could not save the caption."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-photo-manager">
      <div className="sectionhead">
        <span>GALLERY PHOTOS</span>
        <span>
          {photos.length} PHOTO{photos.length === 1 ? "" : "S"}
        </span>
      </div>

      {photos.length ? (
        <div className="admin-photo-grid">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              busy={busyId === photo.id}
              onDelete={() => deletePhoto(photo)}
              onSaveCaption={(caption) => saveCaption(photo, caption)}
            />
          ))}
        </div>
      ) : (
        <p className="empty">NO PHOTOS IN THIS GALLERY YET.</p>
      )}
    </section>
  );
}

function PhotoCard({
  photo,
  busy,
  onDelete,
  onSaveCaption,
}: {
  photo: AdminPhoto;
  busy: boolean;
  onDelete: () => void;
  onSaveCaption: (caption: string) => void;
}) {
  const saved = photo.caption ?? "";
  const [draft, setDraft] = useState(saved);
  const dirty = draft.trim() !== saved.trim();
  const thumb = smallThumb(photo.display_url);

  return (
    <article className="admin-photo-card">
      <img
        src={thumb.src}
        srcSet={thumb.srcSet}
        sizes={thumb.sizes}
        alt={photo.caption || "Gallery photo"}
        loading="lazy"
        decoding="async"
      />

      {/* Plain div (not a <form>): this manager renders inside the gallery form. */}
      <div className="caption-form">
        <textarea
          className="caption-input"
          value={draft}
          placeholder="Add a caption…"
          rows={2}
          maxLength={500}
          disabled={busy}
          aria-label="Photo caption"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (dirty && !busy) onSaveCaption(draft);
            }
          }}
        />

        <div className="photo-card-actions">
          <button
            className="save-caption"
            type="button"
            disabled={!dirty || busy}
            onClick={() => {
              if (dirty && !busy) onSaveCaption(draft);
            }}
          >
            {busy ? "SAVING…" : dirty ? "SAVE CAPTION" : "SAVED"}
          </button>

          <button
            className="delete-photo"
            type="button"
            disabled={busy}
            onClick={onDelete}
          >
            DELETE
          </button>
        </div>
      </div>
    </article>
  );
}
