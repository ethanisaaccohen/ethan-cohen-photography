/** Absolute site origin for metadata (link previews need absolute URLs). */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return new URL(`https://${vercel}`);

  return new URL("http://localhost:3000");
}

/**
 * Link previews use the already-stored thumbnail, never the image optimizer.
 */
export function ogImageUrl(thumbnailUrl: string): string {
  return new URL(thumbnailUrl, siteUrl()).toString();
}

export function formatGameDate(value: string | null | undefined) {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
