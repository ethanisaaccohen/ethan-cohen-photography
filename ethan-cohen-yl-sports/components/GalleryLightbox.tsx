"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gridThumb, lightboxImage } from "@/lib/images";

type Photo = {
  id: string;
  display_url: string;
  caption: string | null;
  tags?: string[];
};

export default function GalleryLightbox({
  photos,
  galleryTitle,
}: {
  photos: Photo[];
  galleryTitle: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

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

  // Deep link: /gallery/<slug>?photo=<id> opens that photo (used by Search results).
  useEffect(() => {
    const photoId = new URLSearchParams(window.location.search).get("photo");
    if (!photoId) return;

    const index = photos.findIndex((photo) => photo.id === photoId);
    if (index >= 0) setActiveIndex(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep ?photo=<id> in the address bar so the open photo can be shared / reloaded.
  useEffect(() => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get("photo");
    const wanted = activePhoto ? activePhoto.id : null;

    if (current === wanted) return;

    if (wanted) url.searchParams.set("photo", wanted);
    else url.searchParams.delete("photo");

    window.history.replaceState(window.history.state, "", url);
  }, [activePhoto]);

  // Preload the neighbours so arrows / swipes feel instant.
  useEffect(() => {
    if (activeIndex === null || photos.length < 2) return;

    const neighbours = [
      photos[(activeIndex + 1) % photos.length],
      photos[(activeIndex - 1 + photos.length) % photos.length],
    ];

    const preloaded = neighbours.map((photo) => {
      const large = lightboxImage(photo.display_url);
      const image = new Image();
      if (large.sizes) image.sizes = large.sizes;
      if (large.srcSet) image.srcset = large.srcSet;
      image.src = large.src;
      return image;
    });

    return () => {
      // Dropping the references lets the browser cancel anything still in flight.
      preloaded.forEach((image) => {
        image.src = "";
      });
    };
  }, [activeIndex, photos]);

  // Move focus into the dialog on open, and back to the thumbnail on close.
  useEffect(() => {
    if (activeIndex !== null) {
      closeButton.current?.focus();
    } else if (lastTrigger.current) {
      lastTrigger.current.focus();
      lastTrigger.current = null;
    }
  }, [activeIndex]);

  function onTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || photos.length < 2) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    // Horizontal swipe of at least 50px that is clearly more sideways than vertical.
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else previous();
    }
  }

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
                onClick={(event) => {
                  lastTrigger.current = event.currentTarget;
                  setActiveIndex(index);
                }}
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
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <button
              type="button"
              className="lightbox-close"
              ref={closeButton}
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

              const isLoaded = loadedId === activePhoto.id;

              return (
                <>
                  {!isLoaded && (
                    <p className="lightbox-loading" aria-live="polite">
                      LOADING…
                    </p>
                  )}
                  <img
                    key={activePhoto.id}
                    className={`lightbox-image${isLoaded ? " is-loaded" : ""}`}
                    src={large.src}
                    srcSet={large.srcSet}
                    sizes={large.sizes}
                    alt={activePhoto.caption || galleryTitle}
                    decoding="async"
                    draggable={false}
                    onLoad={() => setLoadedId(activePhoto.id)}
                  />
                </>
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
              <div className="lightbox-meta">
                <p className="lightbox-count">
                  {activeIndex + 1} / {photos.length}
                  {activePhoto.caption ? ` · ${activePhoto.caption}` : ""}
                </p>

                {activePhoto.tags && activePhoto.tags.length > 0 && (
                  <p className="lightbox-tags">
                    {activePhoto.tags.map((tag) => (
                      <a
                        key={tag}
                        className="tag-chip"
                        href={`/search?q=${encodeURIComponent(tag)}`}
                      >
                        {tag}
                      </a>
                    ))}
                  </p>
                )}
              </div>

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
