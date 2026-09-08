/**
 * Personal access tokens. A token is `ark_` plus 32 random bytes in
 * base64url, shown once; the database keeps a sha256 hash and a display
 * prefix. `Authorization: Bearer <token>` makes any `/api/**` route act as
 * the token's user, with that user's role.
 */
import crypto from "node:crypto";
import prisma from "@/lib/prisma";

export const TOKEN_PREFIX = "ark_";
const PREFIX_LENGTH = TOKEN_PREFIX.length + 8;
const LAST_USED_THROTTLE_MS = 5 * 60 * 1000;

export const MAX_TOKENS_PER_USER = 25;

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateToken(): { raw: string; hash: string; prefix: string } {
  const raw = `${TOKEN_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
  return { raw, hash: hashToken(raw), prefix: raw.slice(0, PREFIX_LENGTH) };
}

/** The raw token in an `Authorization` header, or null when the header is not a bearer token of ours. */
export function bearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(\S+)$/i);
  const raw = match?.[1];
  return raw && raw.startsWith(TOKEN_PREFIX) && raw.length > PREFIX_LENGTH ? raw : null;
}

export type ApiTokenSummary = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
};

const summarySelect = { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true, expiresAt: true } as const;

function toSummary(row: { id: string; name: string; prefix: string; createdAt: Date; lastUsedAt: Date | null; expiresAt: Date | null }): ApiTokenSummary {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

export async function listApiTokens(userId: string): Promise<ApiTokenSummary[]> {
  const rows = await prisma.apiToken.findMany({ where: { userId }, select: summarySelect, orderBy: { createdAt: "desc" } });
  return rows.map(toSummary);
}

export class ApiTokenError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Creates a token; `expiresInDays` null means it never expires. Returns the raw token exactly once. */
export async function createApiToken(userId: string, name: string, expiresInDays: number | null): Promise<{ token: string } & ApiTokenSummary> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) throw new ApiTokenError("name a token with 1 to 80 characters.", 400);
  if (expiresInDays !== null && (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 3650)) {
    throw new ApiTokenError("expiry must be between 1 and 3650 days, or never.", 400);
  }
  if ((await prisma.apiToken.count({ where: { userId } })) >= MAX_TOKENS_PER_USER) {
    throw new ApiTokenError(`revoke a token first; each account holds at most ${MAX_TOKENS_PER_USER}.`, 409);
  }
  const { raw, hash, prefix } = generateToken();
  const row = await prisma.apiToken.create({
    data: {
      userId,
      name: trimmed,
      tokenHash: hash,
      prefix,
      expiresAt: expiresInDays === null ? null : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    },
    select: summarySelect,
  });
  return { token: raw, ...toSummary(row) };
}

/** Deletes a token the caller owns (admins may revoke anyone's). */
export async function revokeApiToken(id: string, actor: { id: string; role: string }): Promise<ApiTokenSummary> {
  const row = await prisma.apiToken.findUnique({ where: { id }, select: { ...summarySelect, userId: true } });
  if (!row) throw new ApiTokenError("that token is already gone.", 404);
  if (row.userId !== actor.id && actor.role !== "admin") throw new ApiTokenError("that token belongs to someone else.", 403);
  await prisma.apiToken.delete({ where: { id } });
  return toSummary(row);
}

export type TokenUser = { id: string; username: string; email: string; displayName: string | null; role: string };

/** The user behind a raw bearer token, or null when unknown or expired. Stamps `lastUsedAt` at most every five minutes. */
export async function resolveApiToken(raw: string): Promise<TokenUser | null> {
  const row = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: { select: { id: true, username: true, email: true, displayName: true, role: true } } },
  });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) {
    void prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return row.user;
}
