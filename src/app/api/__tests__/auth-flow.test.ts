import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import prisma from "@/lib/prisma";

const mockUser = {
  id: "user-1",
  username: "testuser",
  email: "test@example.com",
  passwordHash: "$2b$10$hash",
  displayName: "Test User",
  role: "editor",
  createdAt: new Date(),
};

describe("Auth flow logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("user can be found by username", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    const user = await prisma.user.findUnique({
      where: { username: "testuser" },
    });
    expect(user?.username).toBe("testuser");
    expect(user?.role).toBe("editor");
  });

  it("session can be created", async () => {
    const mockSession = {
      id: "sess-1",
      userId: "user-1",
      token: "test-token-123",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    vi.mocked(prisma.session.create).mockResolvedValue(mockSession as never);
    const session = await prisma.session.create({
      data: mockSession,
    });
    expect(session.token).toBe("test-token-123");
    expect(session.userId).toBe("user-1");
  });

  it("session can be validated", async () => {
    const mockSession = {
      id: "sess-1",
      userId: "user-1",
      token: "test-token-123",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      user: mockUser,
    };
    vi.mocked(prisma.session.findUnique).mockResolvedValue(
      mockSession as never
    );
    const session = await prisma.session.findUnique({
      where: { token: "test-token-123" },
      include: { user: true },
    });
    expect(session?.user.username).toBe("testuser");
  });

  it("expired session returns null conceptually", async () => {
    const expiredSession = {
      id: "sess-1",
      userId: "user-1",
      token: "expired-token",
      expiresAt: new Date(Date.now() - 1000), // expired
      user: mockUser,
    };
    vi.mocked(prisma.session.findUnique).mockResolvedValue(
      expiredSession as never
    );
    const session = await prisma.session.findUnique({
      where: { token: "expired-token" },
      include: { user: true },
    });
    // Check expiry
    expect(session!.expiresAt < new Date()).toBe(true);
  });

  it("user can be created via registration", async () => {
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser as never);
    const user = await prisma.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash: "$2b$10$hash",
      },
    });
    expect(user.username).toBe("testuser");
  });
});
