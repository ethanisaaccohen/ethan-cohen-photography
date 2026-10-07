import { getImageProps } from "next/image";

/**
 * Every photo in B2 is a full-resolution original (20+ MB each).
 * Never put those URLs directly in an <img> tag. Instead, route them through
 * Next.js / Vercel Image Optimization, which resizes + converts to WebP once,
 * caches the result on Vercel's CDN, and serves that small file to visitors.
 *
 * The original B2 URL is only used for the explicit "download original" link.
 */

type OptimizedOptions = {
  /** CSS `sizes` hint so the browser can pick the right width from srcSet. */
  sizes: string;
  /** 1-100. Must be one of the values in next.config.ts `images.qualities`. */
  quality?: number;
};

export type OptimizedImage = {
  src: string;
  srcSet: string | undefined;
  sizes: string | undefined;
};

export function optimizedImage(
  originalUrl: string,
  { sizes, quality = 75 }: OptimizedOptions
): OptimizedImage {
  const { props } = getImageProps({
    src: originalUrl,
    alt: "",
    // Only used for the aspect-ratio hint; actual rendering is controlled by CSS.
    width: 1200,
    height: 800,
    sizes,
    quality,
  });

  return {
    src: props.src,
    srcSet: props.srcSet,
    sizes: props.sizes,
  };
}

/** Gallery grid tile: 1 column on phones, 2 columns on larger screens. */
export function gridThumb(originalUrl: string) {
  return optimizedImage(originalUrl, {
    sizes: "(max-width: 600px) 100vw, (max-width: 1240px) 50vw, 590px",
  });
}

/** Small square-ish thumbnails (admin manager, proofing, search results). */
export function smallThumb(originalUrl: string) {
  return optimizedImage(originalUrl, { sizes: "260px" });
}

/** Home page gallery cover cards. */
export function coverImage(originalUrl: string) {
  return optimizedImage(originalUrl, {
    sizes: "(max-width: 600px) 100vw, 50vw",
  });
}

/** Large image shown inside the lightbox overlay. */
export function lightboxImage(originalUrl: string) {
  return optimizedImage(originalUrl, { sizes: "100vw", quality: 85 });
}
