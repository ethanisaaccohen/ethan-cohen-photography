"use client";

export type ViewingFiles = {
  thumbnail: File;
  viewing: File;
};

async function resizeJpeg(
  source: ImageBitmap,
  filename: string,
  maxDimension: number,
  quality: number
): Promise<File> {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare image processing.");

  try {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Could not encode viewing image."));
      }, "image/jpeg", quality);
    });
    if (blob.type !== "image/jpeg") {
      throw new Error("This browser could not create a JPEG viewing image.");
    }
    return new File([blob], filename, { type: "image/jpeg" });
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function prepareViewingFiles(original: File): Promise<ViewingFiles> {
  if (typeof createImageBitmap !== "function") {
    throw new Error("This browser does not support photo preparation. Use a current desktop browser.");
  }
  const source = await createImageBitmap(original, { imageOrientation: "from-image" });
  try {
    if (!source.width || !source.height) throw new Error("Image dimensions are invalid.");
    const stem = original.name.replace(/\.[^.]+$/, "") || "photo";
    const thumbnail = await resizeJpeg(source, `${stem}-thumbnail.jpg`, 1200, 0.8);
    const viewing = await resizeJpeg(source, `${stem}-viewing.jpg`, 2048, 0.88);
    return { thumbnail, viewing };
  } finally {
    source.close();
  }
}
