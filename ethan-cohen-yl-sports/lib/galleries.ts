const TEXT_FIELDS = ["title", "sport", "team_home", "team_away"] as const;
const SCORE_FIELDS = ["home_score", "away_score"] as const;

export type GalleryUpdate = Record<string, unknown>;

/** Keep only known gallery columns and normalize their values. */
export function sanitizeGalleryInput(body: Record<string, unknown>): GalleryUpdate {
  const update: GalleryUpdate = {};

  for (const field of TEXT_FIELDS) {
    if (body[field] !== undefined) {
      update[field] =
        typeof body[field] === "string" ? (body[field] as string).trim() || null : null;
    }
  }

  for (const field of SCORE_FIELDS) {
    if (body[field] !== undefined) {
      const value = body[field];
      update[field] =
        value === null || value === ""
          ? null
          : Number.isFinite(Number(value))
            ? Number(value)
            : null;
    }
  }

  if (body.game_date !== undefined) {
    const value = body.game_date;
    update.game_date =
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }

  if (body.is_public !== undefined) {
    update.is_public = Boolean(body.is_public);
  }

  if (body.slug !== undefined) {
    // Keep the raw value here; routes decide how to fill an empty slug.
    update.slug = typeof body.slug === "string" ? slugify(body.slug) : "";
  }

  if (body.cover_url !== undefined) {
    update.cover_url =
      typeof body.cover_url === "string" && body.cover_url.startsWith("https://")
        ? body.cover_url
        : null;
  }

  return update;
}

/** "Sarachek 2026: Tier I!" → "sarachek-2026-tier-i". Only a-z, 0-9 and single dashes survive. */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export const SLUG_TAKEN_MESSAGE =
  "That URL is already used by another gallery. Choose a different one.";

/** True when another gallery (not `excludeId`) already uses `slug`. */
export async function slugTaken(
  db: { from: (table: string) => any },
  slug: string,
  excludeId?: string
): Promise<boolean> {
  let query = db.from("galleries").select("id").eq("slug", slug).limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query;
  return Array.isArray(data) && data.length > 0;
}

/** Turn a Postgres/PostgREST error into something a human can act on. */
export function friendlyGalleryError(message: string) {
  if (/duplicate key|unique/i.test(message) && /slug/i.test(message)) {
    return SLUG_TAKEN_MESSAGE;
  }

  return message;
}
