"use client";

import { useCallback, useEffect, useState } from "react";
import { gridThumb } from "@/lib/images";
import Lightbox, { type LightboxPhoto } from "@/components/Lightbox";

export default function GalleryLightbox({
  photos,
  galleryTitle,
}: {
  photos: LightboxPhoto[];
  galleryTitle: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const close = useCallback(() => setActiveIndex(null), []);

  // Deep link: /gallery/<slug>?photo=<id> opens that photo (Search results, shared links).
  useEffect(() => {
    const photoId = new URLSearchParams(window.location.search).get("photo");
    if (!photoId) return;

    const index = photos.findIndex((photo) => photo.id === photoId);
    if (index >= 0) setActiveIndex(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!photos.length) {
    return <p className="empty">NO PHOTOS YET.</p>;
  }

  return (
    <>
      <div className="photos">
        {photos.map((photo, index) => {
          const thumb = gridThumb(photo);

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

      <Lightbox
        photos={photos}
        activeIndex={activeIndex}
        onNavigate={setActiveIndex}
        onClose={close}
        title={galleryTitle}
        syncUrl
      />
    </>
  );
}
