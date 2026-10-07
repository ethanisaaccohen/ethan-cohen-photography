"use client";

import { useEffect, useState } from "react";
import { smallThumb } from "@/lib/images";
import { parseTags } from "@/lib/tags";

export type AdminPhoto = {
  id: string;
  display_url: string;
  caption?: string | null;
  tags?: string[];
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
  galleryId: string;
  photos: AdminPhoto[];
  onChange: (photos: AdminPhoto[]) => void;
  /** The gallery's explicitly chosen cover photo URL (null = automatic). */
  initialCoverUrl?: string | null;
};

export default function AdminPhotoManager({
  galleryId,
  photos,
  onChange,
  initialCoverUrl = null,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const onStatus = setMessage;
  const [bulkTags, setBulkTags] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

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
      if (coverUrl === photo.display_url) setCoverUrl(null);
      onStatus("Photo removed from this gallery.");
    } catch (error) {
      onStatus(
        error instanceof Error ? error.message : "Could not delete this photo."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function savePhoto(
    photo: AdminPhoto,
    changes: { caption?: string; tags?: string[] }
  ) {
    setBusyId(photo.id);
    onStatus("");

    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });

      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(result.error || "Could not save this photo.");
      }

      onChange(
        photos.map((current) =>
          current.id === photo.id
            ? {
                ...current,
                caption: result.caption ?? current.caption ?? "",
                tags: Array.isArray(result.tags) ? result.tags : current.tags,
              }
            : current
        )
      );
      onStatus("Photo saved.");
    } catch (error) {
      onStatus(
        error instanceof Error ? error.message : "Could not save this photo."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function setCover(photo: AdminPhoto | null) {
    const nextCover = photo ? photo.display_url : null;

    setBusyId(photo ? photo.id : "cover");
    onStatus("");

    try {
      const response = await fetch(`/api/admin/gallery/${galleryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_url: nextCover }),
      });

      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(result.error || "Could not update the cover photo.");
      }

      setCoverUrl(result.cover_url ?? null);
      onStatus(
        nextCover
          ? "Cover photo updated. The home page card now uses this photo."
          : "Cover reset. The newest photo is used automatically."
      );
    } catch (error) {
      onStatus(
        error instanceof Error ? error.message : "Could not update the cover photo."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function applyBulkTags() {
    const tags = parseTags(bulkTags);

    if (tags.length === 0 || bulkBusy) return;

    setBulkBusy(true);
    onStatus("");

    try {
      const response = await fetch(`/api/admin/gallery/${galleryId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });

      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(result.error || "Could not add tags.");
      }

      // Merge the new tags into every photo locally.
      onChange(
        photos.map((photo) => {
          const existing = photo.tags ?? [];
          const lower = new Set(existing.map((tag) => tag.toLowerCase()));
          const merged = [...existing];

          for (const tag of tags) {
            if (!lower.has(tag.toLowerCase())) merged.push(tag);
          }

          return { ...photo, tags: merged };
        })
      );

      setBulkTags("");
      onStatus(
        `Added ${result.added} tag${result.added === 1 ? "" : "s"} across ${
          result.photos
        } photo${result.photos === 1 ? "" : "s"}.`
      );
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "Could not add tags.");
    } finally {
      setBulkBusy(false);
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

      {photos.length > 0 && (
        <p className="cover-status">
          {coverUrl
            ? "COVER: CHOSEN PHOTO (marked below)"
            : "COVER: AUTOMATIC (newest photo)"}
          {coverUrl && (
            <button
              type="button"
              className="link-button"
              disabled={busyId !== null}
              onClick={() => setCover(null)}
            >
              USE AUTOMATIC
            </button>
          )}
        </p>
      )}

      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      {photos.length > 0 && (
        <div className="bulk-tags">
          <label htmlFor="bulk-tags-input">
            TAG EVERY PHOTO IN THIS GALLERY
          </label>
          <div className="bulk-tags-row">
            <input
              id="bulk-tags-input"
              className="tags-input"
              value={bulkTags}
              placeholder="e.g. Frisch, DRS, Sarachek"
              disabled={bulkBusy}
              onChange={(event) => setBulkTags(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyBulkTags();
                }
              }}
            />
            <button
              type="button"
              className="bulk-tags-button"
              disabled={bulkBusy || parseTags(bulkTags).length === 0}
              onClick={applyBulkTags}
            >
              {bulkBusy ? "ADDING…" : "ADD TO ALL"}
            </button>
          </div>
          <p className="field-hint">
            Separate tags with commas. Team names and player names make
            photos findable on the public Search page.
          </p>
        </div>
      )}

      {photos.length ? (
        <div className="admin-photo-grid">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              busy={busyId === photo.id}
              isCover={coverUrl === photo.display_url}
              onDelete={() => deletePhoto(photo)}
              onSave={(changes) => savePhoto(photo, changes)}
              onSetCover={() => setCover(photo)}
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
  isCover,
  onDelete,
  onSave,
  onSetCover,
}: {
  photo: AdminPhoto;
  busy: boolean;
  isCover: boolean;
  onDelete: () => void;
  onSave: (changes: { caption?: string; tags?: string[] }) => void;
  onSetCover: () => void;
}) {
  const savedCaption = photo.caption ?? "";
  const savedTags = photo.tags ?? [];

  const [caption, setCaption] = useState(savedCaption);
  const [tagText, setTagText] = useState(savedTags.join(", "));

  // Keep the inputs in sync when the saved value changes from outside
  // (e.g. the bulk tag tool added tags to this photo).
  useEffect(() => {
    setTagText(savedTags.join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedTags.join("\u0000")]);

  const captionDirty = caption.trim() !== savedCaption.trim();
  const tagsDirty =
    parseTags(tagText).join("\u0000").toLowerCase() !==
    savedTags.join("\u0000").toLowerCase();
  const dirty = captionDirty || tagsDirty;

  const thumb = smallThumb(photo.display_url);

  function save() {
    if (!dirty || busy) return;

    const changes: { caption?: string; tags?: string[] } = {};
    if (captionDirty) changes.caption = caption;
    if (tagsDirty) changes.tags = parseTags(tagText);
    onSave(changes);
  }

  return (
    <article className={`admin-photo-card${isCover ? " is-cover" : ""}`}>
      <div className="admin-photo-thumb">
        <img
          src={thumb.src}
          srcSet={thumb.srcSet}
          sizes={thumb.sizes}
          alt={photo.caption || "Gallery photo"}
          loading="lazy"
          decoding="async"
        />

        {isCover ? (
          <span className="cover-badge">COVER</span>
        ) : (
          <button
            type="button"
            className="set-cover"
            disabled={busy}
            onClick={onSetCover}
          >
            SET AS COVER
          </button>
        )}
      </div>

      {/* Plain div (not a <form>): this manager renders inside the gallery form. */}
      <div className="caption-form">
        <textarea
          className="caption-input"
          value={caption}
          placeholder="Add a caption…"
          rows={2}
          maxLength={500}
          disabled={busy}
          aria-label="Photo caption"
          onChange={(event) => setCaption(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              save();
            }
          }}
        />

        <textarea
          className="tags-input"
          value={tagText}
          placeholder="Tags: players, teams… (comma separated)"
          rows={Math.min(6, Math.max(2, Math.ceil(tagText.length / 26)))}
          disabled={busy}
          aria-label="Photo tags, comma separated"
          onChange={(event) => setTagText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
        />

        <div className="photo-card-actions">
          <button
            className="save-caption"
            type="button"
            disabled={!dirty || busy}
            onClick={save}
          >
            {busy ? "SAVING…" : dirty ? "SAVE" : "SAVED"}
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
