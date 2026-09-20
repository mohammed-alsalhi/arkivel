// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ default: {
  user: { findFirst: vi.fn(), create: vi.fn() },
  oAuthAccount: { findUnique: vi.fn() },
  session: { create: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
} }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
let authOptions: typeof import("../oauth").authOptions;
beforeAll(async () => {
  vi.stubEnv("NEXTAUTH_SECRET", "test-only-secret");
  vi.stubEnv("GITHUB_CLIENT_ID", "test-only-client");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "test-only-client-secret");
  ({ authOptions } = await import("../oauth"));
});
afterAll(() => vi.unstubAllEnvs());
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("ARKIVEL_REGISTRATION", "closed"); vi.mocked(cookies).mockResolvedValue({ get: () => undefined, toString: () => "", set: vi.fn() } as never); });
const account = { provider: "github", providerAccountId: "provider-subject" };
const attempt = () => authOptions.callbacks!.signIn!({ account, user: { email: "owner@example.test", name: "owner" } } as never);

describe("OAuth identity boundary", () => {
  it("keeps already-linked identities usable with registration closed", async () => {
    vi.mocked(prisma.oAuthAccount.findUnique).mockResolvedValue({ id: "linked", userId: "internal" } as never);
    expect(await attempt()).toBe(true);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
  it("rejects new identities when closed or no owner exists", async () => {
    expect(await attempt()).toBe(false);
    vi.stubEnv("ARKIVEL_REGISTRATION", "open");
    expect(await attempt()).toBe(false);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it("does not link an existing privileged user just because emails match", async () => {
    vi.stubEnv("ARKIVEL_REGISTRATION", "open");
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "existing-owner" } as never);
    expect(await attempt()).toBe(false);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it("creates an atomic viewer identity without storing provider tokens", async () => {
    vi.stubEnv("ARKIVEL_REGISTRATION", "open");
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({ id: "owner" } as never).mockResolvedValueOnce(null);
    expect(await attempt()).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ role: "viewer", passwordHash: "", oauthAccounts: { create: account } }) });
  });
  it("issues a database session from the provider identity, never the claimed email", async () => {
    vi.mocked(prisma.oAuthAccount.findUnique).mockResolvedValue({ userId: "linked-id" } as never);
    vi.mocked(prisma.session.create).mockResolvedValue({ token: "opaque-db-token" } as never);
    const clearCookie = vi.fn();
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: "previous-local" }), toString: () => "", set: clearCookie } as never);
    const token = await authOptions.callbacks!.jwt!({ account, token: { email: "other@example.test" } } as never);
    expect(token.arkivelSessionToken).toBe("opaque-db-token");
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { token: { in: ["previous-local"] } } });
    expect(clearCookie).toHaveBeenCalledWith("session_token", "", expect.objectContaining({ maxAge: 0 }));
    expect(prisma.session.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "linked-id" }) }));
    await authOptions.events!.signOut!({ token } as never);
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { token: "opaque-db-token" } });
  });
  it("does not expose the opaque token and clears users after revocation", async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue({ expiresAt: new Date(Date.now() + 60000), user: { id: "linked", role: "viewer", username: "viewer" } } as never);
    const response = await authOptions.callbacks!.session!({ session: {}, token: { arkivelSessionToken: "secret-session", role: "admin" } } as never);
    expect(response.user).toMatchObject({ id: "linked", role: "viewer" });
    expect(JSON.stringify(response)).not.toContain("secret-session");
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null);
    expect((await authOptions.callbacks!.session!({ session: response, token: { arkivelSessionToken: "secret-session" } } as never)).user).toBeUndefined();
  });
});
