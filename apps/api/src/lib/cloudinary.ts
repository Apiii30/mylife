import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";

export const cloudinaryEnabled = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const ALLOWED_FORMATS = "jpg,jpeg,png,webp,heic,heif,gif,avif";

export function assertCloudinary() {
  if (!cloudinaryEnabled) throw new HttpError(503, "UPLOAD_DISABLED");
}

/** Semua foto user disimpan di bawah folder ini — dipakai juga untuk memverifikasi kepemilikan. */
export const userFolder = (userId: string) => `mylife/${userId}`;

/**
 * Parameter upload bertanda tangan untuk satu file. Browser mengunggah langsung ke Cloudinary,
 * jadi public_id dikunci di sini agar file selalu masuk ke folder milik user.
 */
export function signUpload(userId: string) {
  const folder = userFolder(userId);
  const params = {
    timestamp: Math.round(Date.now() / 1000),
    public_id: `${folder}/${randomBytes(9).toString("base64url")}`,
    asset_folder: folder,
    media_metadata: true, // EXIF → tanggal foto diambil
    allowed_formats: ALLOWED_FORMATS,
  };
  const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET!);
  return { params, signature };
}

export const uploadEndpoint = () => `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Respons upload ditandatangani Cloudinary — memastikan public_id & versi tidak dipalsukan klien.
 * Sama dengan `utils.verify_api_response_signature` milik SDK (yang tidak ada di definisi tipenya).
 */
export function verifyUpload(publicId: string, version: number, signature: string) {
  const expected = createHash("sha1").update(`public_id=${publicId}&version=${version}${env.CLOUDINARY_API_SECRET}`).digest("hex");
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export const deliveryUrl = (publicId: string, version: number, format: string) =>
  `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/v${version}/${publicId}.${format}`;

/** Hapus dari Cloudinary (best-effort: data di database tetap terhapus walau ini gagal). */
export async function destroyImages(publicIds: string[]) {
  if (!cloudinaryEnabled || !publicIds.length) return;
  try {
    // Satu foto lewat Upload API (tanpa kuota), banyak foto lewat Admin API (maks. 100 per panggilan)
    if (publicIds.length === 1) return void (await cloudinary.uploader.destroy(publicIds[0], { invalidate: true }));
    for (let i = 0; i < publicIds.length; i += 100) {
      await cloudinary.api.delete_resources(publicIds.slice(i, i + 100), { invalidate: true });
    }
  } catch (error) {
    console.error("Gagal menghapus dari Cloudinary:", error);
  }
}
