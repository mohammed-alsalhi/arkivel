// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileHeaders, getStorage, storageProvider, validStorageKey } from "../storage";
afterEach(() => vi.unstubAllEnvs());
it("stores private local files, rejects traversal, and downloads active content safely", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "arkivel-storage-"));
  vi.stubEnv("ARKIVEL_STORAGE", "local"); vi.stubEnv("ARKIVEL_UPLOAD_DIR", directory); vi.stubEnv("VERCEL", "0");
  const key = "uploads/12345678-1234-1234-1234-123456789012.svg";
  try {
    const body = Buffer.from("<svg onload='alert(1)'/>");
    expect((await getStorage().upload(body, key, "image/svg+xml")).url).toBe(`/api/files/${key}`);
    expect(await getStorage().read(key)).toEqual(body);
    expect(await getStorage().read("uploads/../../package.json")).toBeNull();
    expect(validStorageKey("uploads/12345678-1234-1234-1234-123456789012.svg/extra")).toBe(false);
    expect(fileHeaders(key)["Content-Disposition"]).toContain("attachment");
    expect(fileHeaders(key)["Content-Security-Policy"]).toContain("sandbox");
    await expect(getStorage().upload(body, key, "image/svg+xml")).rejects.toMatchObject({ code: "EEXIST" });
    vi.stubEnv("ARKIVEL_STORAGE", "vercel"); vi.stubEnv("ARKIVEL_ACCESS", "private");
    expect(storageProvider).toThrow("Private instances require");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it("round-trips S3 objects through the signed SDK transport without issuing public URLs", async () => {
  const { createServer } = await import("node:http");
  const objects = new Map<string, Buffer>();
  let signed = false;
  const server = createServer(async (request, response) => {
    signed ||= request.headers.authorization?.startsWith("AWS4-HMAC-SHA256") === true;
    const key = request.url!.split("?")[0];
    if (request.method === "PUT") {
      const chunks = []; for await (const chunk of request) chunks.push(chunk);
      objects.set(key, Buffer.concat(chunks)); response.setHeader("ETag", '"test"'); response.end();
    } else {
      const body = objects.get(key);
      if (!body) { response.writeHead(404, { "Content-Type": "application/xml" }); response.end("<Error><Code>NoSuchKey</Code></Error>"); }
      else { response.setHeader("Content-Length", body.length); response.end(body); }
    }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  vi.stubEnv("ARKIVEL_STORAGE", "s3"); vi.stubEnv("ARKIVEL_S3_BUCKET", "test-bucket");
  vi.stubEnv("ARKIVEL_S3_REGION", "us-east-1"); vi.stubEnv("ARKIVEL_S3_FORCE_PATH_STYLE", "true");
  vi.stubEnv("ARKIVEL_S3_ENDPOINT", `http://127.0.0.1:${address.port}`);
  vi.stubEnv("AWS_ACCESS_KEY_ID", "test-only-key"); vi.stubEnv("AWS_SECRET_ACCESS_KEY", "test-only-secret");
  const key = "assets/12345678-1234-1234-1234-123456789012.txt";
  try {
    const data = Buffer.from("portable private object");
    expect((await getStorage().upload(data, key, "text/plain")).url).toBe(`/api/files/${key}`);
    expect(Buffer.from((await getStorage().read(key))!)).toEqual(data);
    expect(signed).toBe(true);
    expect(objects.has(`/test-bucket/${key}`)).toBe(true);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
