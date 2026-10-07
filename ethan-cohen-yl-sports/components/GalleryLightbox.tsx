"use client";

import { useCallback, useEffect, useState } from "react";
import { gridThumb, lightboxImage } from "@/lib/images";

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

  const activePhoto = activeIndex === null ? null : photos[activeIndex];

  const close = useCallback(() => setActiveIndex(null), []);

  const previous = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? null : (current - 1 + photos.length) % photos.length
    );
  }, [photos.length]);

  const next = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? null : (current + 1) % photos.length
    );
  }, [photos.length]);

  // Keyboard controls + lock page scroll while the overlay is open.
  useEffect(() => {
    if (activeIndex === null) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, close, previous, next]);

  if (!photos.length) {
    return <p className="empty">NO PHOTOS YET.</p>;
  }

  return (
    <>
      <div className="photos">
        {photos.map((photo, index) => {
          const thumb = gridThumb(photo.display_url);

          return (
            <figure key={photo.id}>
              <button
                type="button"
                className="photo-trigger"
                onClick={() => setActiveIndex(index)}
                aria-label={`Open photo ${index + 1} of ${photos.length}`}
              >
                <img
                  src={thumb.src}
                  srcSet={thumb.srcSet}
                  sizes={thumb.sizes}
                  alt={photo.caption || `${galleryTitle} photo ${index + 1}`}
                  loading={index < 6 ? "eager" : "lazy"}
                  decoding="async"
                />
              </button>

              {photo.caption && <figcaption>{photo.caption}</figcaption>}
            </figure>
          );
        })}
      </div>

      {activePhoto && activeIndex !== null && (
        <div className="lightbox-backdrop" onMouseDown={close}>
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

            {photos.length > 1 && (
              <button
                type="button"
                className="lightbox-prev"
                onClick={previous}
                aria-label="Previous image"
              >
                ←
              </button>
            )}

            {(() => {
              const large = lightboxImage(activePhoto.display_url);

              return (
                <img
                  key={activePhoto.id}
                  className="lightbox-image"
                  src={large.src}
                  srcSet={large.srcSet}
                  sizes={large.sizes}
                  alt={activePhoto.caption || galleryTitle}
                  decoding="async"
                />
              );
            })()}

            {photos.length > 1 && (
              <button
                type="button"
                className="lightbox-next"
                onClick={next}
                aria-label="Next image"
              >
                →
              </button>
            )}

            <div className="lightbox-footer">
              <p className="lightbox-count">
                {activeIndex + 1} / {photos.length}
                {activePhoto.caption ? ` · ${activePhoto.caption}` : ""}
              </p>

              <a
                href={activePhoto.display_url}
                target="_blank"
                rel="noreferrer"
                download
              >
                Download original ↗
              </a>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
