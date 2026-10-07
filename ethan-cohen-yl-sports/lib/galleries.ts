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

  if (body.cover_url !== undefined) {
    update.cover_url =
      typeof body.cover_url === "string" && body.cover_url.startsWith("https://")
        ? body.cover_url
        : null;
  }

  return update;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Turn a Postgres/PostgREST error into something a human can act on. */
export function friendlyGalleryError(message: string) {
  if (/duplicate key|unique/i.test(message) && /slug/i.test(message)) {
    return "A gallery with this title already exists. Choose a different title.";
  }

  return message;
}
