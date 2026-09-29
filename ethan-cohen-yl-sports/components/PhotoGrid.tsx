"use client";

import { useEffect, useState } from "react";

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

  const selectedPhoto =
    selectedIndex === null ? null : photos[selectedIndex];

  const close = () => setSelectedIndex(null);

  const showPrevious = () => {
    if (selectedIndex === null) return;

    setSelectedIndex((selectedIndex - 1 + photos.length) % photos.length);
  };

  const showNext = () => {
    if (selectedIndex === null) return;

    setSelectedIndex((selectedIndex + 1) % photos.length);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (selectedIndex === null) return;

      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedIndex, photos.length]);

  if (!photos.length) {
    return <p className="empty">NO PHOTOS YET.</p>;
  }

  return (
    <>
      <div className="photos">
        {photos.map((photo, index) => (
<figure key={photo.id}>
  <button
    className="photoButton"
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

      {selectedPhoto && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={close}
        >
          <button
            className="lightboxClose"
            type="button"
            aria-label="Close photo viewer"
            onClick={close}
          >
            ×
          </button>

          {photos.length > 1 && (
            <button
              className="lightboxPrevious"
              type="button"
              aria-label="Previous photo"
              onClick={(event) => {
                event.stopPropagation();
                showPrevious();
              }}
            >
              ←
            </button>
          )}

          <div
            className="lightboxContent"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={selectedPhoto.display_url}
              alt={selectedPhoto.caption || galleryTitle}
            />

            <div className="lightboxMeta">
              <span>
                {selectedIndex! + 1} / {photos.length}
              </span>

              {selectedPhoto.caption && <span>{selectedPhoto.caption}</span>}
            </div>
          </div>

          {photos.length > 1 && (
            <button
              className="lightboxNext"
              type="button"
              aria-label="Next photo"
              onClick={(event) => {
                event.stopPropagation();
                showNext();
              }}
            >
              →
            </button>
          )}
        </div>
      )}
    </>
  );
}
