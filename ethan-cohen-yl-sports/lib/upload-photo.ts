"use client";

import { prepareViewingFiles } from "@/lib/prepare-photo";

export type StoredAsset = { publicUrl: string; key: string };

async function jsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server returned an invalid response (${response.status}).`);
  }
}

export async function uploadPhotoAsset(file: File, galleryId: string): Promise<StoredAsset> {
  const type = file.type || "application/octet-stream";
  const response = await fetch("/api/admin/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, type, galleryId }),
  });
  const signed = await jsonResponse(response);
  if (!response.ok) throw new Error(signed.error || "Could not authorize photo upload.");
  if (typeof signed.url !== "string" || typeof signed.publicUrl !== "string" || typeof signed.key !== "string" || !signed.url || !signed.publicUrl || !signed.key) {
    throw new Error("Photo upload authorization was incomplete.");
  }
  const uploaded = await fetch(signed.url, {
    method: "PUT",
    headers: { "Content-Type": type },
    body: file,
  });
  if (!uploaded.ok) throw new Error(`Storage upload failed (${uploaded.status}).`);
  return { publicUrl: signed.publicUrl, key: signed.key };
}

export async function uploadPersistentPhoto(original: File, galleryId: string) {
  // Prepare both derivatives before uploading anything. The original is unchanged.
  const prepared = await prepareViewingFiles(original);
  const thumbnail = await uploadPhotoAsset(prepared.thumbnail, galleryId);
  const viewing = await uploadPhotoAsset(prepared.viewing, galleryId);
  const full = await uploadPhotoAsset(original, galleryId);
  // Create a record only after all three storage uploads succeed. Failed attempts
  // can leave unreferenced objects; do not delete storage automatically here.
  const response = await fetch(`/api/admin/gallery/${encodeURIComponent(galleryId)}/photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      display_url: full.publicUrl,
      storage_key: full.key,
      thumbnail_url: thumbnail.publicUrl,
      thumbnail_storage_key: thumbnail.key,
      viewing_url: viewing.publicUrl,
      viewing_storage_key: viewing.key,
      caption: "",
      tags: [],
    }),
  });
  const photo = await jsonResponse(response);
  if (!response.ok) throw new Error(photo.error || "Could not save prepared photo.");
  if (!photo.id || photo.thumbnail_url !== thumbnail.publicUrl || photo.viewing_url !== viewing.publicUrl) {
    throw new Error("Photo save returned incomplete viewing-image information. Refresh the gallery before retrying to avoid a duplicate.");
  }
  return photo;
}
