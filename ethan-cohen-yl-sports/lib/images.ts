/** Stored derivatives only. Never fall back to an original or /_next/image. */
export type PhotoImages = {
  display_url?: string | null;
  thumbnail_url?: string | null;
  viewing_url?: string | null;
};

export const PHOTO_PREVIEWS_BUCKET = "photo-previews";

export function gridThumb(photo: PhotoImages) {
  return { src: photo.thumbnail_url || "/placeholder.svg", srcSet: undefined, sizes: undefined };
}

export const smallThumb = gridThumb;
export const coverImage = gridThumb;

export function lightboxImage(photo: PhotoImages) {
  return {
    src: photo.viewing_url || photo.thumbnail_url || "/placeholder.svg",
    srcSet: undefined,
    sizes: undefined,
  };
}

/** cover_url remains an original identifier; resolve its stored thumbnail. */
export function chosenCover(
  photos: (PhotoImages & { created_at?: string | null })[],
  coverUrl?: string | null
): string | null {
  const explicit = photos.find((p) => p.display_url === coverUrl || p.thumbnail_url === coverUrl);
  const newest = [...photos].sort((a, b) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  )[0];
  return (explicit ?? newest)?.thumbnail_url || null;
}
