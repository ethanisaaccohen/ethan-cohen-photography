"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Photo = {
  id: string;
  display_url: string;
  caption: string | null;
};

type PhotoGridProps = {
  photos: Photo[];
  galleryTitle: string;
};

export default function PhotoGrid({
  photos,
  galleryTitle,
}: PhotoGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const selectedPhoto =
    selectedIndex === null ? null : photos[selectedIndex];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedIndex(null);
      }

      if (event.key === "ArrowLeft") {
        setSelectedIndex((current) => {
          if (current === null) return null;
          return (current - 1 + photos.length) % photos.length;
        });
      }

      if (event.key === "ArrowRight") {
        setSelectedIndex((current) => {
          if (current === null) return null;
          return (current + 1) % photos.length;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedIndex, photos.length]);

  const previous = () => {
    setSelectedIndex((current) => {
      if (current === null) return null;
      return (current - 1 + photos.length) % photos.length;
    });
  };

  const next = () => {
    setSelectedIndex((current) => {
      if (current === null) return null;
      return (current + 1) % photos.length;
    });
  };

  if (!photos.length) {
    return <p className="empty">NO PHOTOS YET.</p>;
  }

  const modal =
    mounted && selectedPhoto
      ? createPortal(
          <div
            className="photo-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            onClick={() => setSelectedIndex(null)}
          >
            <button
              className="photo-modal-close"
              type="button"
              aria-label="Close photo viewer"
              onClick={() => setSelectedIndex(null)}
            >
              ×
            </button>

            {photos.length > 1 && (
              <button
                className="photo-modal-prev"
                type="button"
                aria-label="Previous photo"
                onClick={(event) => {
                  event.stopPropagation();
                  previous();
                }}
              >
                ←
              </button>
            )}

            <div
              className="photo-modal-content"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={selectedPhoto.display_url}
                alt={selectedPhoto.caption || galleryTitle}
              />

              <p className="photo-modal-count">
 {(selectedIndex ?? 0) + 1} / {photos.length}
              </p>

              {selectedPhoto.caption && (
                <p className="photo-modal-caption">
                  {selectedPhoto.caption}
                </p>
              )}
            </div>

            {photos.length > 1 && (
              <button
                className="photo-modal-next"
                type="button"
                aria-label="Next photo"
                onClick={(event) => {
                  event.stopPropagation();
                  next();
                }}
              >
                →
              </button>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="photos">
        {photos.map((photo, index) => (
          <figure key={photo.id}>
            <button
              className="gallery-photo-trigger"
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Open photo ${index + 1} of ${photos.length}`}
            >
              <img
                src={photo.display_url}
                alt={photo.caption || `${galleryTitle} photo ${index + 1}`}
              />
            </button>

            {photo.caption && <figcaption>{photo.caption}</figcaption>}
          </figure>
        ))}
      </div>

      {modal}
    </>
  );
}
