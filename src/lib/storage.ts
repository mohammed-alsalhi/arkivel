import { put } from "@vercel/blob";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isPrivateInstance } from "./instance-access";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export function storageProvider() {
  const provider = process.env.ARKIVEL_STORAGE || (process.env.BLOB_READ_WRITE_TOKEN ? "vercel" : "local");
  if (!["local", "s3", "vercel"].includes(provider)) throw new Error("Unknown ARKIVEL_STORAGE provider");
  if (provider === "vercel" && isPrivateInstance()) throw new Error("Private instances require local or private S3 storage; public Blob URLs are not private");
  if (provider === "local" && process.env.VERCEL === "1") throw new Error("Local storage needs persistent disk; configure S3 on Vercel");
  return provider;
}

export function validStorageKey(key: string) {
  return /^(assets|uploads)\/[a-f0-9-]{36}\.[a-z0-9]{1,10}$/.test(key);
}

export function uploadExtension(name: string) {
  const extension = path.extname(name).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : ".bin";
}

function localPath(key: string) {
  if (!validStorageKey(key)) throw new Error("Invalid storage key");
  return path.join(path.resolve(process.env.ARKIVEL_UPLOAD_DIR || "data/uploads"), key);
}

function s3() {
  const bucket = process.env.ARKIVEL_S3_BUCKET;
  if (!bucket) throw new Error("ARKIVEL_S3_BUCKET is required");
  return { bucket, client: new S3Client({
    region: process.env.ARKIVEL_S3_REGION || "auto",
    endpoint: process.env.ARKIVEL_S3_ENDPOINT || undefined,
    forcePathStyle: process.env.ARKIVEL_S3_FORCE_PATH_STYLE === "true",
  }) };
}

export function fileHeaders(key: string) {
  const images: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif" };
  const imageType = images[path.extname(key)];
  return {
    "Content-Type": imageType || "application/octet-stream",
    "Content-Disposition": `${imageType ? "inline" : "attachment"}; filename="${path.basename(key)}"`,
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  };
}

const storage = {
  async upload(file: Buffer, filename: string, contentType: string) {
    if (!validStorageKey(filename) || file.length > MAX_UPLOAD_BYTES) throw new Error("Invalid or oversized upload");
    const provider = storageProvider();
    if (provider === "vercel") {
      const blob = await put(filename, file, { access: "public", contentType });
      return { url: blob.url };
    }
    if (provider === "local") {
      const target = localPath(filename);
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, file, { flag: "wx", mode: 0o600 });
    } else {
      const { bucket, client } = s3();
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: filename, Body: file, ContentType: contentType || "application/octet-stream" }));
    }
    return { url: `/api/files/${filename}` };
  },
  async read(key: string): Promise<Uint8Array | null> {
    if (!validStorageKey(key)) return null;
    const provider = storageProvider();
    try {
      if (provider === "local") return await readFile(localPath(key));
      if (provider === "s3") {
        const { bucket, client } = s3();
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        // Only Arkivel-generated objects belong here; uploads are capped at 20 MiB.
        if ((result.ContentLength ?? 0) > MAX_UPLOAD_BYTES) throw new Error("Stored object exceeds upload limit");
        return await result.Body?.transformToByteArray() ?? null;
      }
      return null;
    } catch (error) {
      if (error && typeof error === "object" && (("code" in error && error.code === "ENOENT") || ("name" in error && error.name === "NoSuchKey"))) return null;
      throw error;
    }
  },
};

export function getStorage() { return storage; }
