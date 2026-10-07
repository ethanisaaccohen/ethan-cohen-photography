"use client";

import { useState } from "react";
import { smallThumb } from "@/lib/images";

export default function ProofingClient({ gallery, photos }: any) {
  const [picked, setPicked] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    const r = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gallery_id: gallery.id,
        name,
        email,
        photo_ids: picked,
      }),
    });

    setMessage(r.ok ? "Favorites sent to Ethan." : (await r.json()).error);
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
        <p>{picked.length} selected</p>
        <label>
          YOUR NAME
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          EMAIL
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button onClick={submit}>SEND FAVORITES →</button>
        {message && <p className="notice">{message}</p>}
      </div>
    </main>
  );
}
