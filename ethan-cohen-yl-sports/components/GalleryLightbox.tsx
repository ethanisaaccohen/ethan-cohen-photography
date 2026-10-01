"use client";

import { useEffect, useState } from "react";

type Photo = {
  id: string;
  display_url: string;
  caption: string | null;
};

export default function GalleryLightbox({
  photos,
  galleryTitle,
}: {
  photos: Photo[];
  galleryTitle: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activePhoto =
    activeIndex === null ? null : photos[activeIndex];

  function close() {
    setActiveIndex(null);
  }

  function previous() {
    if (activeIndex === null) return;

    setActiveIndex(
      (activeIndex - 1 + photos.length) % photos.length
    );
  }

  function next() {
    if (activeIndex === null) return;

    setActiveIndex((activeIndex + 1) % photos.length);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (activeIndex === null) return;

      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, photos.length]);

  return (
    <>
      <div className="photos">
        {photos.map((photo, index) => (
          <figure key={photo.id}>
            <button
              type="button"
              className="photo-trigger"
              onClick={() => setActiveIndex(index)}
              aria-label={`Open ${photo.caption || galleryTitle}`}
            >
              <img
                src={photo.display_url}
                alt={photo.caption || galleryTitle}
              />
            </button>

            {photo.caption && (
              <figcaption>{photo.caption}</figcaption>
            )}
          </figure>
        ))}
      </div>

      {activePhoto && (
        <div
          className="lightbox-backdrop"
          onMouseDown={close}
        >
          <section
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={activePhoto.caption || galleryTitle}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="lightbox-close"
              onClick={close}
              aria-label="Close image"
            >
              ×
            </button>

            <button
              type="button"
              className="lightbox-prev"
              onClick={previous}
              aria-label="Previous image"
            >
              ←
            </button>

            <img
              className="lightbox-image"
              src={activePhoto.display_url}
              alt={activePhoto.caption || galleryTitle}
            />

            <button
              type="button"
              className="lightbox-next"
              onClick={next}
              aria-label="Next image"
            >
              →
            </button>

            <div className="lightbox-footer">
              {activePhoto.caption && (
                <p>{activePhoto.caption}</p>
              )}

              <a
                href={activePhoto.display_url}
                target="_blank"
                rel="noreferrer"
              >
                Open full size
              </a>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
