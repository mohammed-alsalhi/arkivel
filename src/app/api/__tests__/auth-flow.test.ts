// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

vi.mock("@/lib/prisma", () => ({ default: {
  user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  session: { create: vi.fn(), deleteMany: vi.fn() },
} }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { POST as register } from "../auth/register/route";
import { POST as login } from "../auth/login/route";
import { POST as logout } from "../auth/logout/route";
const credentials = { username: "new_user", email: "new@example.test", password: "a long test password" };
const request = (body: unknown) => new NextRequest("https://wiki.example.test/api/auth/register", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("ARKIVEL_REGISTRATION", "closed"); vi.stubEnv("NEXTAUTH_SECRET", ""); vi.mocked(cookies).mockResolvedValue({ get: () => undefined, getAll: () => [] } as never); });
afterEach(() => vi.unstubAllEnvs());

describe("registration policy", () => {
  it("defaults closed and rejects empty-instance takeover even when open", async () => {
    expect((await register(request(credentials))).status).toBe(403);
    vi.stubEnv("ARKIVEL_REGISTRATION", "open");
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    expect((await register(request(credentials))).status).toBe(403);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it("only creates a viewer, ignoring an injected role", async () => {
    vi.stubEnv("ARKIVEL_REGISTRATION", "open");
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({ id: "owner" } as never).mockResolvedValueOnce(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "new", role: "viewer" } as never);
    expect((await register(request({ ...credentials, role: "admin" }))).status).toBe(201);
    const data = vi.mocked(prisma.user.create).mock.calls[0][0].data;
    expect(data.role).toBe("viewer");
    expect(await bcrypt.compare(credentials.password, data.passwordHash)).toBe(true);
  });
  it.each([null, { ...credentials, username: {} }, { ...credentials, password: "short" }, { ...credentials, password: "🦄".repeat(20) }])("rejects malformed registration input", async body => {
    vi.stubEnv("ARKIVEL_REGISTRATION", "open");
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "owner" } as never);
    expect((await register(request(body))).status).toBe(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it("handles a concurrent duplicate without a server error", async () => {
    vi.stubEnv("ARKIVEL_REGISTRATION", "open");
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({ id: "owner" } as never).mockResolvedValueOnce(null);
    vi.mocked(prisma.user.create).mockRejectedValue({ code: "P2002" });
    expect((await register(request(credentials))).status).toBe(409);
  });
});

describe("local login and logout", () => {
  it("creates a revocable session and a secure HttpOnly cookie", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "owner", ...credentials, passwordHash: await bcrypt.hash(credentials.password, 4), role: "admin" } as never);
    vi.mocked(prisma.session.create).mockImplementation((({ data }: { data: unknown }) => Promise.resolve(data)) as never);
    const response = await login(request(credentials));
    expect(response.status).toBe(200);
    const cookie = response.cookies.get("session_token");
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "strict" });
    expect(cookie?.value).toHaveLength(64);
    expect(prisma.session.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "owner", token: cookie?.value }) }));
  });
  it("rejects OAuth-only accounts and malformed login inputs", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ passwordHash: "" } as never);
    expect((await login(request(credentials))).status).toBe(401);
    expect((await login(request(null))).status).toBe(400);
    expect((await login(request({ username: {}, password: {} }))).status).toBe(400);
    expect(prisma.session.create).not.toHaveBeenCalled();
  });
  it("revokes local sessions and clears chunked OAuth cookies", async () => {
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: "local-token" }), getAll: () => [{ name: "__Secure-next-auth.session-token.0" }, { name: "__Secure-next-auth.session-token.1" }] } as never);
    const response = await logout(request({}));
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { token: { in: ["local-token"] } } });
    expect(response.cookies.get("session_token")?.maxAge).toBe(0);
    expect(response.cookies.get("__Secure-next-auth.session-token.1")?.maxAge).toBe(0);
  });
});


it("logout revokes a signed OAuth session as well as the local session", async () => {
  vi.stubEnv("NEXTAUTH_SECRET", "test-only-logout-secret");
  vi.stubEnv("NEXTAUTH_URL", "https://wiki.example.test");
  const { encode } = await import("next-auth/jwt");
  const jwt = await encode({ secret: process.env.NEXTAUTH_SECRET!, token: { arkivelSessionToken: "oauth-token" } });
  vi.mocked(cookies).mockResolvedValue({
    get: () => ({ value: "local-token" }),
    getAll: () => [{ name: "__Secure-next-auth.session-token", value: jwt }],
    toString: () => `__Secure-next-auth.session-token=${jwt}`,
  } as never);
  const response = await logout(request({}));
  expect(response.status).toBe(200);
  expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { token: { in: ["local-token", "oauth-token"] } } });
});
