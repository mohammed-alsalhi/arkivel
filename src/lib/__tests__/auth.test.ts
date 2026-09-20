import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(async () => ({ get: () => null })),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    session: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    apiToken: {
      findUnique: vi.fn(),
      update: vi.fn(async () => ({})),
    },
  },
}));

import { cookies, headers } from "next/headers";
import prisma from "@/lib/prisma";
import { generateToken } from "../api-tokens";
import { getSession, isAdmin, requireAdmin, requireRole, type SessionUser } from "../auth";

describe("getSession with a personal access token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
  });

  it("resolves the token's user when there is no session cookie", async () => {
    const { raw, hash } = generateToken();
    vi.mocked(headers).mockResolvedValue({ get: (name: string) => (name === "authorization" ? `Bearer ${raw}` : null) } as never);
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({
      id: "tok", expiresAt: null, lastUsedAt: null,
      user: { id: "u1", username: "script", email: "s@example.test", displayName: null, role: "editor" },
    } as never);
    expect(await getSession()).toMatchObject({ id: "u1", role: "editor" });
    expect(prisma.apiToken.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash: hash } }));
  });

  it("rejects expired, unknown, and foreign bearer tokens", async () => {
    const { raw } = generateToken();
    vi.mocked(headers).mockResolvedValue({ get: () => `Bearer ${raw}` } as never);
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "tok", expiresAt: new Date(Date.now() - 1000), lastUsedAt: null, user: { role: "admin" } } as never);
    expect(await getSession()).toBeNull();
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue(null as never);
    expect(await getSession()).toBeNull();
    vi.mocked(headers).mockResolvedValue({ get: () => "Bearer not-ours" } as never);
    expect(await getSession()).toBeNull();
    expect(prisma.apiToken.findUnique).toHaveBeenCalledTimes(2);
  });
});

describe("isAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_SECRET", undefined);
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("denies anonymous production requests when no admin secret is configured", async () => {
    expect(await isAdmin()).toBe(false);
  });

  it.each(["admin", "editor"])("checks the authenticated %s role even without a production admin secret", async (role) => {
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: "example-session" }) } as never);
    vi.mocked(prisma.session.findUnique).mockResolvedValue({ expiresAt: new Date(Date.now() + 60_000), user: { role } } as never);
    expect(await isAdmin()).toBe(role === "admin");
  });

  it("allows the no-secret bypass only in explicit development mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await isAdmin()).toBe(true);
    expect(cookies).not.toHaveBeenCalled();
    vi.stubEnv("NODE_ENV", "test");
    expect(await isAdmin()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_SECRET", "configured");
    expect(await isAdmin()).toBe(false);
  });
});

describe("requireAdmin", () => {
  it("returns null when authorized", () => {
    expect(requireAdmin(true)).toBeNull();
  });
  it("returns 401 response when unauthorized", () => {
    const result = requireAdmin(false);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });
});

describe("requireRole", () => {
  const admin: SessionUser = {
    id: "1",
    username: "admin",
    email: "admin@test.com",
    displayName: "Admin",
    role: "admin",
  };
  const editor: SessionUser = {
    id: "2",
    username: "editor",
    email: "editor@test.com",
    displayName: "Editor",
    role: "editor",
  };
  const viewer: SessionUser = {
    id: "3",
    username: "viewer",
    email: "viewer@test.com",
    displayName: "Viewer",
    role: "viewer",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for null user", () => {
    const result = requireRole(null, "viewer");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("allows admin to access all roles", () => {
    expect(requireRole(admin, "admin")).toBeNull();
    expect(requireRole(admin, "editor")).toBeNull();
    expect(requireRole(admin, "viewer")).toBeNull();
  });

  it("allows editor to access editor and viewer", () => {
    expect(requireRole(editor, "editor")).toBeNull();
    expect(requireRole(editor, "viewer")).toBeNull();
  });

  it("denies editor from admin role", () => {
    const result = requireRole(editor, "admin");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("allows viewer to access viewer only", () => {
    expect(requireRole(viewer, "viewer")).toBeNull();
  });

  it("denies viewer from editor role", () => {
    const result = requireRole(viewer, "editor");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("denies viewer from admin role", () => {
    const result = requireRole(viewer, "admin");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
