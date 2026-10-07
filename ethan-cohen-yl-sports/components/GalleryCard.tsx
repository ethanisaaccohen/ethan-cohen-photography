import Link from "next/link";
import { coverImage } from "@/lib/images";

type Props = { gallery: any };

export default function GalleryCard({ gallery }: Props) {
  const cover = gallery.cover_url ? coverImage(gallery.cover_url) : null;

  return (
    <Link className="card" href={`/gallery/${gallery.slug}`}>
      {cover ? (
        <img
          src={cover.src}
          srcSet={cover.srcSet}
          sizes={cover.sizes}
          alt={gallery.title}
          decoding="async"
        />
      ) : (
        <img src="/placeholder.svg" alt={gallery.title} />
      )}

      <div className="overlay">
        <p>{gallery.sport?.toUpperCase()}</p>
        <h2>{gallery.title}</h2>
        <span>{gallery.photo_count || 0} PHOTOS ↗</span>
      </div>
    </Link>
  );
}
