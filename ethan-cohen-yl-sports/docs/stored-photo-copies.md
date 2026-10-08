# Stored image copies

## Data flow

At upload time, the admin browser decodes the selected local file and makes two
JPEG derivatives: a thumbnail with a 1200px maximum long side (450 KB maximum),
and a viewing copy with a 2048px maximum long side (1.8 MB maximum). Originals
are uploaded unchanged to Backblaze B2 via the existing presigned PUT flow.

The two copies go to the Supabase Storage `photo-previews` bucket via
`POST /api/admin/gallery/[id]/derivatives`. That route requires the existing admin
cookie and validates JPEG metadata, dimensions and byte budgets using Sharp.
The service-role client uploads the copies with one-year cache-control.

Only after both copies and the original upload succeed is a photo published.
The photo creation route verifies that the copy objects exist and that their
URLs correspond to their storage keys. It rejects records missing copies.

Database fields:

- `display_url`, `storage_key`: unchanged B2 original, used only for explicit
  original-download/open links, not image sources.
- `thumbnail_url`, `thumbnail_storage_key`: stored gallery/admin/search/cover copy.
- `viewing_url`, `viewing_storage_key`: stored lightbox copy.

## Viewing

All image helpers in `lib/images.ts` now return stored copy URLs directly.
There are no Next.js image transformation URLs or original-image fallbacks.
Missing copies show a placeholder rather than pulling an original.
Link-preview metadata also uses the stored thumbnail.

The lightbox fetches only the selected viewing copy. Neighbor preloading was
removed to avoid downloading viewing copies a visitor has not opened.
Explicit original-download links still incur B2 original transfer.

The Supabase bucket is public-read, matching the previous public B2 objects.
Uploads remain server-only behind admin authentication. Moving copies does not
create a new authentication/privacy guarantee for private galleries.

## Existing photos

On October 8, 2026 UTC, all 165 then-existing photos received stored copies.
The one-time backfill used the previously optimized 2048px viewing version as
its source, retaining the original B2 URL and files. All 330 copies were stored
before the UI switch. The temporary migration function was retired afterward.
Normal viewing no longer invokes that backfill or any resizing.

Existing-copy totals:

- Thumbnails: 18,775,505 bytes total; 113,791 bytes average.
- Viewing copies: 80,517,018 bytes total; 487,982 bytes average.

Sizes depend on image content. Supabase storage/egress quotas still apply.
This removes B2 from the ordinary-viewing path, not all bandwidth usage.

## Verification

`tests/photo-copies.cjs` is an assertion-based local integration test covering:
local-file resizing, actual copy-upload API and dimension validation, publication
after copies, storage failure, absent-copy rejection, gallery requests,
cover selection, Search deep links, original-download link preservation and
mobile rendering. Its local storage transport and B2 PUT transport are fixtures;
it is not proof of a real authenticated production B2 upload.

Live checks should inspect cold browser image requests on every public gallery.
There must be no `backblazeb2.com` image requests or `/_next/image` requests, and
no viewing-copy requests before opening a photo.

## Limits and operational follow-up

- The new authenticated production original-upload flow still needs a real admin
  session to exercise end-to-end. The existing B2 credentials/signing and original
  PUT mechanism are unchanged.
- Failed original upload or photo-record creation can leave unreferenced copy
  objects. No destructive storage garbage collection was added.
- Deleting photos/gallery database records does not delete B2 originals or
  Supabase copy objects. Define retention and cleanup separately.
- Do not restore an original-image fallback to hide copy errors; fix missing
  copies instead.
