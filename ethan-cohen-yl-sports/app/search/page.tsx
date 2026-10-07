"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { smallThumb } from "@/lib/images";
import type { SearchResponse } from "@/app/api/search/route";

export default function SearchPage() {
  return (
    <>
      <Header />
      <main className="page">
        <p className="eyebrow">PUBLIC PHOTO ARCHIVE</p>
        <h1 className="title">SEARCH.</h1>
        <Suspense fallback={null}>
          <SearchClient />
        </Suspense>
      </main>
    </>
  );
}

function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lastRun = useRef("");

  async function runSearch(term: string) {
    const trimmed = term.trim();

    if (trimmed.length < 2) {
      setResults(null);
      setError(trimmed ? "Type at least 2 characters." : "");
      return;
    }

    lastRun.current = trimmed;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);

      if (!response.ok) throw new Error("Search failed. Please try again.");

      const data = (await response.json()) as SearchResponse;

      // Ignore stale responses if the user searched again meanwhile.
      if (lastRun.current === trimmed) setResults(data);
    } catch (searchError) {
      setError(
        searchError instanceof Error ? searchError.message : "Search failed."
      );
    } finally {
      if (lastRun.current === trimmed) setLoading(false);
    }
  }

  // Run a search when the page is opened with ?q=… (e.g. from a tag chip).
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      runSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.replace(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
    runSearch(trimmed);
  }

  const hasResults =
    results && (results.galleries.length > 0 || results.photos.length > 0);

  return (
    <>
      <form className="search-form" onSubmit={submit} role="search">
        <input
          className="search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a player, team, or game"
          aria-label="Search photos"
          autoComplete="off"
        />
        <button type="submit" disabled={loading}>
          {loading ? "SEARCHING…" : "SEARCH →"}
        </button>
      </form>

      {error && <p className="notice">{error}</p>}

      {results && !loading && !hasResults && (
        <p className="empty">NO RESULTS FOR “{results.query.toUpperCase()}”.</p>
      )}

      {results && results.galleries.length > 0 && (
        <section className="search-section">
          <div className="sectionhead">
            <span>GALLERIES</span>
            <span>{results.galleries.length}</span>
          </div>

          <div>
            {results.galleries.map((gallery) => (
              <Link
                className="score"
                href={`/gallery/${gallery.slug}`}
                key={gallery.id}
              >
                <span>
                  <b>{gallery.title}</b>
                  <br />
                  {gallery.sport ?? ""}
                  {gallery.game_date ? ` · ${gallery.game_date}` : ""}
                  {gallery.team_home || gallery.team_away
                    ? ` · ${gallery.team_home ?? ""} vs. ${gallery.team_away ?? ""}`
                    : ""}
                </span>
                <strong className="search-count">
                  {gallery.photo_count} PHOTO{gallery.photo_count === 1 ? "" : "S"}
                </strong>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results && results.photos.length > 0 && (
        <section className="search-section">
          <div className="sectionhead">
            <span>TAGGED PHOTOS</span>
            <span>{results.photos.length}</span>
          </div>

          <div className="proofGrid">
            {results.photos.map((photo) => {
              const thumb = smallThumb(photo.display_url);

              return (
                <Link
                  className="proofCard search-card"
                  href={`/gallery/${photo.slug}?photo=${photo.id}`}
                  key={photo.id}
                >
                  <img
                    src={thumb.src}
                    srcSet={thumb.srcSet}
                    sizes={thumb.sizes}
                    alt={photo.caption || photo.gallery_title}
                    loading="lazy"
                    decoding="async"
                  />
                  <small>{photo.gallery_title}</small>
                  {photo.tags.length > 0 && (
                    <span className="search-tags">
                      {photo.tags.map((tag) => (
                        <span className="tag-chip" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
