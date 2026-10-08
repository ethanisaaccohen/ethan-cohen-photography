"use client";

/** Generate copies from the selected local file, before any storage upload. */
export async function createPhotoDerivatives(file: File) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error("Use a JPG, PNG, or WEBP image.");
  }
  if (file.size > 80 * 1024 * 1024) throw new Error("Images must be under 80 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 80_000_000) {
      throw new Error("This image is too large to process safely (maximum 80 megapixels).");
    }
    async function resize(longestSide: number, quality: number, maxBytes: number) {
      const scale = Math.min(1, longestSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser could not create an image preview.");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      try {
        let blob: Blob | null = null;
        for (let q = quality; q >= 0.46; q -= 0.06) {
          blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", q));
          if (!blob) throw new Error("Could not encode the image preview.");
          if (blob.size <= maxBytes) return blob;
        }
        throw new Error("This image preview is too large. Please try a different image.");
      } finally {
        canvas.width = canvas.height = 1;
      }
    }
    // Sequential encoding avoids holding multiple large canvases at once.
    const thumbnail = await resize(1200, 0.78, 450_000);
    const viewing = await resize(2048, 0.86, 1_800_000);
    return { thumbnail, viewing };
  } finally {
    bitmap.close();
  }
}
