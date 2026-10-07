"use client";

import { useEffect, useState } from "react";

type Props = {
  slug: string;
  isPublic: boolean;
  proofToken: string | null;
};

/** Shows the public gallery link, or the private proofing link, with a copy button. */
export default function ShareLinks({ slug, isPublic, proofToken }: Props) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const path = isPublic
    ? `/gallery/${slug}`
    : proofToken
      ? `/proof/${proofToken}`
      : null;

  const url = path ? `${origin}${path}` : "";

  async function copy() {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopied("Copied.");
    } catch {
      setCopied("Select the link above and copy it.");
    }

    window.setTimeout(() => setCopied(""), 2500);
  }

  return (
    <section className="share-links" id="share">
      <div className="sectionhead">
        <span>{isPublic ? "PUBLIC LINK" : "PRIVATE PROOFING LINK"}</span>
        <span>{isPublic ? "ANYONE CAN VIEW" : "ONLY PEOPLE WITH THE LINK"}</span>
      </div>

      {path ? (
        <>
          <div className="share-row">
            <input
              className="share-url"
              readOnly
              value={url}
              aria-label="Shareable link"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" className="share-copy" onClick={copy}>
              COPY
            </button>
            <a className="button secondary share-open" href={path} target="_blank" rel="noreferrer">
              OPEN ↗
            </a>
          </div>
          <p className="field-hint">
            {copied ||
              (isPublic
                ? "This gallery is listed on the home page and in Search."
                : "Clients open this link, pick favorites and submit them. It is not listed anywhere public.")}
          </p>
        </>
      ) : (
        <p className="field-hint">
          Save the gallery once to generate its private proofing link.
        </p>
      )}
    </section>
  );
}
