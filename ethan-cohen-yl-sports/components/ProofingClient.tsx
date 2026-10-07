"use client";

import { useState } from "react";
import { smallThumb } from "@/lib/images";

export default function ProofingClient({ gallery, photos }: any) {
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (sending || sent) return;

    if (picked.length === 0) {
      setMessage("Tap ♡ FAVORITE on at least one photo first.");
      return;
    }

    if (!name.trim() || !email.trim()) {
      setMessage("Add your name and email so Ethan knows who picked these.");
      return;
    }

    setSending(true);
    setMessage("");

    try {
      const r = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gallery_id: gallery.id,
          name: name.trim(),
          email: email.trim(),
          photo_ids: picked,
        }),
      });

      if (!r.ok) {
        let error = "Could not send your favorites. Please try again.";
        try {
          error = (await r.json()).error || error;
        } catch {
          /* non-JSON error body */
        }
        throw new Error(error);
      }

      setSent(true);
      setMessage(
        `Sent ${picked.length} favorite${picked.length === 1 ? "" : "s"} to Ethan. Thank you!`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not send your favorites."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page">
      <p className="eyebrow">PRIVATE CLIENT PROOFING</p>
      <h1 className="title">{gallery.title}</h1>
      <p className="intro">
        Tap the heart on the photos you want. Then send Ethan your selection.
      </p>

      <div className="proofGrid">
        {photos.map((p: any) => {
          const thumb = smallThumb(p.display_url);

          return (
            <div className="proofCard" key={p.id}>
              <img
                src={thumb.src}
                srcSet={thumb.srcSet}
                sizes={thumb.sizes}
                alt="Proof"
                loading="lazy"
                decoding="async"
              />
              <button
                className="heart"
                type="button"
                disabled={sent}
                aria-pressed={picked.includes(p.id)}
                onClick={() =>
                  setPicked((x) =>
                    x.includes(p.id) ? x.filter((i) => i !== p.id) : [...x, p.id]
                  )
                }
              >
                {picked.includes(p.id) ? "♥ FAVORITE" : "♡ FAVORITE"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="form" style={{ marginTop: 35 }}>
        <p className="proof-count">
          {picked.length} SELECTED
        </p>
        <label>
          YOUR NAME
          <input
            value={name}
            autoComplete="name"
            disabled={sent}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          EMAIL
          <input
            type="email"
            value={email}
            autoComplete="email"
            disabled={sent}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="button" onClick={submit} disabled={sending || sent}>
          {sent ? "FAVORITES SENT ✓" : sending ? "SENDING…" : "SEND FAVORITES →"}
        </button>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
