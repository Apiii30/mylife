"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { exifDate } from "@/lib/cloudinary";
import { galleryKeys, type Photo } from "@/lib/queries/gallery";

export type UploadStatus = "queued" | "uploading" | "saving" | "done" | "error";
export type UploadItem = { id: string; name: string; preview: string; progress: number; status: UploadStatus; error?: "size" | "type" | "failed" };

export type Signed = { params: Record<string, string | number | boolean>; signature: string };
export type CloudinaryResponse = {
  public_id: string;
  version: number;
  signature: string;
  format: string;
  width: number;
  height: number;
  media_metadata?: Record<string, unknown>;
  image_metadata?: Record<string, unknown>;
};

export const MAX_BYTES = 10 * 1024 * 1024; // batas file gambar Cloudinary paket gratis
const CONCURRENCY = 3;
const BATCH = 20;
const ACCEPT = /^image\/(jpeg|png|webp|heic|heif|gif|avif)$/;
const isImage = (file: File) => ACCEPT.test(file.type) || /\.(heic|heif)$/i.test(file.name);

/** XHR (bukan fetch) agar progres unggahan bisa ditampilkan. */
export function uploadToCloudinary(endpoint: string, apiKey: string, signed: Signed, file: File, onProgress: (p: number) => void) {
  return new Promise<CloudinaryResponse>((resolve, reject) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(signed.params)) form.append(key, String(value));
    form.append("api_key", apiKey);
    form.append("signature", signed.signature);
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(xhr.responseText)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(form);
  });
}

/** Antrean unggah: tanda tangan dari API → unggah langsung ke Cloudinary → catat ke API. */
export function usePhotoUploader(albumId: string | null) {
  const { call } = useApi();
  const client = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const previews = useRef<string[]>([]);

  const patch = useCallback((id: string, update: Partial<UploadItem>) => setItems((all) => all.map((i) => (i.id === id ? { ...i, ...update } : i))), []);

  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const upload = useCallback(
    async (files: File[]) => {
      const queued = files.map((file) => {
        const preview = URL.createObjectURL(file);
        previews.current.push(preview);
        const error = !isImage(file) ? ("type" as const) : file.size > MAX_BYTES ? ("size" as const) : undefined;
        return { file, item: { id: crypto.randomUUID(), name: file.name, preview, progress: 0, status: error ? "error" : "queued", error } as UploadItem };
      });
      setItems((all) => [...all, ...queued.map((q) => q.item)]);

      const valid = queued.filter((q) => !q.item.error);
      let uploaded = 0;

      for (let start = 0; start < valid.length; start += BATCH) {
        const batch = valid.slice(start, start + BATCH);
        let signed: { endpoint: string; apiKey: string; uploads: Signed[] };
        try {
          signed = await call("/photos/sign", { method: "POST", body: { count: batch.length } });
        } catch {
          batch.forEach((q) => patch(q.item.id, { status: "error", error: "failed" }));
          continue;
        }

        // Kolam pekerja kecil: maksimal 3 unggahan berjalan bersamaan
        let next = 0;
        const worker = async () => {
          while (next < batch.length) {
            const index = next++;
            const { file, item } = batch[index];
            try {
              patch(item.id, { status: "uploading" });
              const res = await uploadToCloudinary(signed.endpoint, signed.apiKey, signed.uploads[index], file, (progress) => patch(item.id, { progress }));
              patch(item.id, { status: "saving", progress: 1 });
              const meta = res.media_metadata ?? res.image_metadata ?? {};
              await call<{ photo: Photo }>("/photos", {
                method: "POST",
                body: {
                  publicId: res.public_id,
                  version: res.version,
                  signature: res.signature,
                  format: res.format,
                  width: res.width,
                  height: res.height,
                  takenAt: exifDate(meta.DateTimeOriginal ?? meta.CreateDate),
                  albumId,
                },
              });
              patch(item.id, { status: "done" });
              uploaded++;
            } catch {
              patch(item.id, { status: "error", error: "failed" });
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batch.length) }, worker));
        // Segarkan galeri per batch agar foto muncul bertahap
        await Promise.all([client.invalidateQueries({ queryKey: galleryKeys.photos }), client.invalidateQueries({ queryKey: galleryKeys.albums })]);
      }
      return uploaded;
    },
    [call, client, albumId, patch],
  );

  const clear = useCallback(() => setItems((all) => all.filter((i) => i.status === "uploading" || i.status === "queued" || i.status === "saving")), []);

  return { items, upload, clear, busy: items.some((i) => i.status === "uploading" || i.status === "queued" || i.status === "saving") };
}
