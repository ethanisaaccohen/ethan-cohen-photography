"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { lightboxImage } from "@/lib/images";

export type LightboxPhoto = {
  id: string;
  display_url: string;
  caption: string | null;
  tags?: string[];
  thumbnail_url?: string | null;
  viewing_url?: string | null;
};

type Props = {
  photos: LightboxPhoto[];
  /** Index of the open photo, or null when closed. */
  activeIndex: number | null;
  onNavigate: (index: number) => void;
  onClose: () => void;
  title: string;
  /** Keep ?photo=<id> in the address bar (public galleries). */
  syncUrl?: boolean;
  /** Extra controls rendered in the footer for the open photo (e.g. a favorite button). */
  renderActions?: (photo: LightboxPhoto, index: number) => ReactNode;
  /** Show the "Download original" link (default true). */
  allowDownload?: boolean;
};

/**
 * Full-screen photo overlay shared by the public gallery and the proofing page.
 * Keyboard arrows / Escape, touch swipe, neighbour preloading, scroll lock.
 */
export default function Lightbox({
  photos,
  activeIndex,
  onNavigate,
  onClose,
  title,
  syncUrl = false,
  renderActions,
  allowDownload = true,
}: Props) {
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const hasOpened = useRef(false);

  const activePhoto = activeIndex === null ? null : photos[activeIndex];
  const count = photos.length;

  const previous = useCallback(() => {
    if (activeIndex === null || count < 2) return;
    onNavigate((activeIndex - 1 + count) % count);
  }, [activeIndex, count, onNavigate]);

  const next = useCallback(() => {
    if (activeIndex === null || count < 2) return;
    onNavigate((activeIndex + 1) % count);
  }, [activeIndex, count, onNavigate]);

  // Keep ?photo=<id> in the address bar so the open photo can be shared / reloaded.
  useEffect(() => {
    if (!syncUrl) return;

    // Never touch the URL before the first open: on initial load the parent
    // still needs to read ?photo=<id> to open the deep-linked photo.
    if (activePhoto) hasOpened.current = true;
    if (!hasOpened.current) return;

    const url = new URL(window.location.href);
    const current = url.searchParams.get("photo");
    const wanted = activePhoto ? activePhoto.id : null;

    if (current === wanted) return;

    if (wanted) url.searchParams.set("photo", wanted);
    else url.searchParams.delete("photo");

    window.history.replaceState(window.history.state, "", url);
  }, [activePhoto, syncUrl]);

  // Do not preload viewing copies: only the photo explicitly opened is fetched.

  // Focus management: into the dialog on open, back where it was on close.
  useEffect(() => {
    if (activeIndex !== null) {
      if (!previouslyFocused.current) {
        previouslyFocused.current = document.activeElement as HTMLElement | null;
      }
      closeButton.current?.focus();
    } else if (previouslyFocused.current) {
      previouslyFocused.current.focus();
      previouslyFocused.current = null;
    }
  }, [activeIndex]);

  // Keyboard controls + lock page scroll while the overlay is open.
  useEffect(() => {
    if (activeIndex === null) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, onClose, previous, next]);

  function onTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || count < 2) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else previous();
    }
  }

  if (!activePhoto || activeIndex === null) return null;

  const large = lightboxImage(activePhoto);
  const isLoaded = loadedId === activePhoto.id;

  return (
    <div className="lightbox-backdrop" onMouseDown={onClose}>
      <section
        className="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={activePhoto.caption || title}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          className="lightbox-close"
          ref={closeButton}
          onClick={onClose}
          aria-label="Close image"
        >
          ×
        </button>

        {count > 1 && (
          <button
            type="button"
            className="lightbox-prev"
            onClick={previous}
            aria-label="Previous image"
          >
            ←
          </button>
        )}

        {!isLoaded && (
          <p className="lightbox-loading" aria-live="polite">
            {failedId === activePhoto.id ? (
              <>
                Could not load the viewing copy.{" "}
                <button type="button" onClick={() => { setFailedId(null); setRetry((n) => n + 1); }}>
                  RETRY
                </button>
              </>
            ) : "LOADING…"}
          </p>
        )}
        <img
          key={`${activePhoto.id}-${retry}`}
          className={`lightbox-image${isLoaded ? " is-loaded" : ""}`}
          src={large.src}
          srcSet={large.srcSet}
          sizes={large.sizes}
          alt={activePhoto.caption || title}
          decoding="async"
          draggable={false}
          onLoad={() => setLoadedId(activePhoto.id)}
          onError={() => { setLoadedId(null); setFailedId(activePhoto.id); }}
        />

        {count > 1 && (
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
              {activeIndex + 1} / {count}
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

          <div className="lightbox-actions">
            {renderActions?.(activePhoto, activeIndex)}

            {allowDownload && (
              <a
                href={activePhoto.display_url}
                target="_blank"
                rel="noreferrer"
                download
              >
                Download original ↗
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
