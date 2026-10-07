"use client";

import Header from "@/components/Header";
import { useState } from "react";
import { smallThumb } from "@/lib/images";

export default function Search() {
  const [q, setQ] = useState("");
  const [r, setR] = useState<any[]>([]);

  async function go(e: any) {
    e.preventDefault();
    const x = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    setR(await x.json());
  }

  return (
    <>
      <Header />
      <main className="page">
        <p className="eyebrow">PUBLIC PHOTO ARCHIVE</p>
        <h1 className="title">SEARCH.</h1>
        <form onSubmit={go}>
          <input
            className="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a player or team"
          />
          <button>SEARCH →</button>
        </form>
        <div className="proofGrid" style={{ marginTop: 30 }}>
          {r.map((p) => {
            const thumb = smallThumb(p.display_url);

            return (
              <a className="proofCard" href={`/gallery/${p.slug}`} key={p.id}>
                <img
                  src={thumb.src}
                  srcSet={thumb.srcSet}
                  sizes={thumb.sizes}
                  alt="Search result"
                  loading="lazy"
                  decoding="async"
                />
                <small>{p.gallery_title}</small>
              </a>
            );
          })}
        </div>
      </main>
    </>
  );
}
