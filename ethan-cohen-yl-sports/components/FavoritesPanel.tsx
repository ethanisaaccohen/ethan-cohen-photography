import { smallThumb } from "@/lib/images";

export type FavoriteSubmission = {
  id: string;
  name: string;
  email: string;
  created_at: string | null;
  photos: { id: string; display_url: string; caption: string | null; thumbnail_url?: string | null }[];
  missing: number;
};

function formatDate(value: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

/** Client favorites sent from the private proofing page, newest first. */
export default function FavoritesPanel({
  submissions,
}: {
  submissions: FavoriteSubmission[];
}) {
  return (
    <section className="favorites-panel">
      <div className="sectionhead">
        <span>CLIENT FAVORITES</span>
        <span>
          {submissions.length} SUBMISSION{submissions.length === 1 ? "" : "S"}
        </span>
      </div>

      {submissions.length === 0 ? (
        <p className="field-hint">
          Nobody has sent favorites from the proofing link yet. Submissions appear
          here with the client&apos;s name, email and the photos they picked.
        </p>
      ) : (
        submissions.map((submission) => (
          <article className="favorites-submission" key={submission.id}>
            <header className="favorites-head">
              <div>
                <b>{submission.name}</b>
                <a href={`mailto:${submission.email}`}>{submission.email}</a>
              </div>
              <span>
                {submission.photos.length} PHOTO
                {submission.photos.length === 1 ? "" : "S"}
                {submission.created_at ? ` · ${formatDate(submission.created_at)}` : ""}
              </span>
            </header>

            <div className="favorites-grid">
              {submission.photos.map((photo) => {
                const thumb = smallThumb(photo);

                return (
                  <a
                    className="favorites-photo"
                    key={photo.id}
                    href={photo.display_url}
                    target="_blank"
                    rel="noreferrer"
                    title={photo.caption || "Open original"}
                  >
                    <img
                      src={thumb.src}
                      srcSet={thumb.srcSet}
                      sizes={thumb.sizes}
                      alt={photo.caption || "Favorite photo"}
                      loading="lazy"
                      decoding="async"
                    />
                  </a>
                );
              })}
            </div>

            {submission.missing > 0 && (
              <p className="field-hint">
                {submission.missing} picked photo{submission.missing === 1 ? " was" : "s were"} deleted
                from the gallery after this submission.
              </p>
            )}
          </article>
        ))
      )}
    </section>
  );
}
