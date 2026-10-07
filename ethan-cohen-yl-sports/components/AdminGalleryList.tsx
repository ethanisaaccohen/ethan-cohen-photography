"use client";

import { useState } from "react";
import Link from "next/link";
import { smallThumb } from "@/lib/images";

export type AdminGallery = {
  id: string;
  title: string;
  slug: string;
  sport: string | null;
  game_date: string | null;
  team_home: string | null;
  team_away: string | null;
  is_public: boolean;
  cover_url: string | null;
  photo_count: number;
  favorites_count: number;
};

export default function AdminGalleryList({
  galleries: initial,
}: {
  galleries: AdminGallery[];
}) {
  const [galleries, setGalleries] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function deleteGallery(gallery: AdminGallery) {
    const confirmed = window.confirm(
      `Delete "${gallery.title}" and its ${gallery.photo_count} photo record${
        gallery.photo_count === 1 ? "" : "s"
      }? This cannot be undone.`
    );

    if (!confirmed) return;

    setBusyId(gallery.id);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/gallery/${gallery.id}`, {
        method: "DELETE",
      });

      let result: { error?: string } = {};
      try {
        result = await response.json();
      } catch {
        /* empty body */
      }

      if (!response.ok) {
        throw new Error(result.error || "Could not delete this gallery.");
      }

      setGalleries((current) => current.filter((g) => g.id !== gallery.id));
      setMessage(`Deleted "${gallery.title}".`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not delete this gallery."
      );
    } finally {
      setBusyId(null);
    }
  }

  if (galleries.length === 0) {
    return <p className="empty">NO GALLERIES YET. CREATE YOUR FIRST ONE ABOVE.</p>;
  }

  return (
    <>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      <div className="admin-gallery-list">
        {galleries.map((gallery) => {
          const cover = gallery.cover_url ? smallThumb(gallery.cover_url) : null;
          const busy = busyId === gallery.id;

          return (
            <article className="admin-gallery-row" key={gallery.id}>
              <Link
                className="admin-gallery-cover"
                href={`/admin/gallery/${gallery.id}`}
                aria-label={`Edit ${gallery.title}`}
              >
                {cover ? (
                  <img
                    src={cover.src}
                    srcSet={cover.srcSet}
                    sizes={cover.sizes}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="admin-gallery-nocover">NO PHOTOS</span>
                )}
              </Link>

              <div className="admin-gallery-info">
                <b>{gallery.title}</b>
                <span>
                  {gallery.sport ?? ""}
                  {gallery.game_date ? ` · ${gallery.game_date}` : ""}
                  {gallery.team_home && gallery.team_away
                    ? ` · ${gallery.team_home} vs. ${gallery.team_away}`
                    : gallery.team_home || gallery.team_away
                      ? ` · ${gallery.team_home || gallery.team_away}`
                      : ""}
                </span>
                <span>
                  {gallery.photo_count} PHOTO{gallery.photo_count === 1 ? "" : "S"} ·{" "}
                  <em className={gallery.is_public ? "is-public" : "is-private"}>
                    {gallery.is_public ? "PUBLIC" : "PRIVATE PROOFING"}
                  </em>
                  {gallery.favorites_count > 0 &&
                    ` · ${gallery.favorites_count} FAVORITES SUBMISSION${
                      gallery.favorites_count === 1 ? "" : "S"
                    }`}
                </span>
              </div>

              <div className="admin-gallery-actions">
                <Link className="button" href={`/admin/gallery/${gallery.id}`}>
                  EDIT
                </Link>
                <a
                  className="button secondary"
                  href={gallery.is_public ? `/gallery/${gallery.slug}` : `/admin/gallery/${gallery.id}#share`}
                  target={gallery.is_public ? "_blank" : undefined}
                  rel="noreferrer"
                >
                  {gallery.is_public ? "VIEW ↗" : "SHARE LINK"}
                </a>
                <button
                  type="button"
                  className="delete-photo"
                  disabled={busy}
                  onClick={() => deleteGallery(gallery)}
                >
                  {busy ? "DELETING…" : "DELETE"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
