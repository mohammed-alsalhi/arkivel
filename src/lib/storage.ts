import { put } from "@vercel/blob";

const storage = {
  async upload(file: Buffer, filename: string, contentType: string) {
    const blob = await put(filename, file, { access: "public", contentType });
    return { url: blob.url };
  },
};

export function getStorage() {
  return storage;
}
