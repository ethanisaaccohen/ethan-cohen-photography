/** Shared tag normalization used by the admin API routes and UI. */

export const MAX_TAGS_PER_PHOTO = 25;
export const MAX_TAG_LENGTH = 40;

/** Turn free text ("Frisch, #12 Cohen , frisch") into a clean, de-duplicated list. */
export function parseTags(input: unknown): string[] {
  const raw: string[] = Array.isArray(input)
    ? input.filter((value): value is string => typeof value === "string")
    : typeof input === "string"
      ? input.split(/[,\n]/)
      : [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const value of raw) {
    const tag = value.replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH);
    const key = tag.toLowerCase();

    if (!tag || seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);

    if (tags.length >= MAX_TAGS_PER_PHOTO) break;
  }

  return tags;
}

/** Flatten Supabase's embedded `photo_tags(tag)` relation into a string array. */
export function tagsFromRelation(
  relation: { tag: string }[] | { tag: string } | null | undefined
): string[] {
  if (!relation) return [];
  const rows = Array.isArray(relation) ? relation : [relation];
  return rows.map((row) => row.tag).filter(Boolean);
}
