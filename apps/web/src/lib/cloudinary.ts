import type { ImageLoader } from "next/image";

/**
 * Sisipkan transformasi Cloudinary ke URL foto: ukuran sesuai kebutuhan, format & kualitas otomatis
 * (HEIC dari iPhone otomatis dikirim sebagai WebP/AVIF).
 */
export function cldUrl(url: string, { width, height, crop = "limit", extra }: { width: number; height?: number; crop?: "limit" | "fill"; extra?: string }) {
  const parts = [`c_${crop}`, `w_${Math.round(width)}`, height && `h_${Math.round(height)}`, crop === "fill" && "g_auto", "f_auto", "q_auto", extra];
  return url.replace("/upload/", `/upload/${parts.filter(Boolean).join(",")}/`);
}

/** Loader next/image: biarkan Cloudinary yang mengubah ukuran (bukan server Next). */
export const cloudinaryLoader: ImageLoader = ({ src, width }) => cldUrl(src, { width });

/** URL yang memaksa unduhan file asli. */
export const downloadUrl = (url: string) => url.replace("/upload/", "/upload/fl_attachment/");

/** "2024:05:01 10:00:00" (EXIF, waktu lokal kamera) → ISO, atau null. */
export function exifDate(value: unknown) {
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const date = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isNaN(date.getTime()) || date.getFullYear() < 1990 ? null : date.toISOString();
}
