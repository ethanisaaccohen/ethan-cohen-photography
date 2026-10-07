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
 * A 1200px wide optimized version of a B2 original, as an absolute URL.
 * Used for Open Graph / iMessage / WhatsApp link previews so they never
 * download the 20+ MB original.
 */
export function ogImageUrl(originalUrl: string): string {
  const params = new URLSearchParams({ url: originalUrl, w: "1200", q: "75" });
  return new URL(`/_next/image?${params.toString()}`, siteUrl()).toString();
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
