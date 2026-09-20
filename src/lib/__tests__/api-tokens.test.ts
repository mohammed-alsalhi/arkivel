import { describe, expect, it } from "vitest";
import { bearerToken, generateToken, hashToken, TOKEN_PREFIX } from "../api-tokens";
import { corsHeaders, parseCorsOrigins } from "../cors";

describe("personal access tokens", () => {
  it("generates prefixed, hashed, unguessable tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a.raw.startsWith(TOKEN_PREFIX)).toBe(true);
    expect(a.raw.length).toBeGreaterThan(40);
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).toBe(hashToken(a.raw));
    expect(a.hash).toHaveLength(64);
    expect(a.prefix).toBe(a.raw.slice(0, 12));
    expect(a.raw).not.toContain(a.hash);
  });

  it("reads only our bearer tokens from the authorization header", () => {
    const { raw } = generateToken();
    expect(bearerToken(`Bearer ${raw}`)).toBe(raw);
    expect(bearerToken(`bearer ${raw}`)).toBe(raw);
    expect(bearerToken(`Basic abc`)).toBeNull();
    expect(bearerToken("Bearer sk_other_token_value")).toBeNull();
    expect(bearerToken("Bearer ark_")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });
});

describe("api cors", () => {
  it("is off unless origins are configured", () => {
    expect(parseCorsOrigins(undefined)).toEqual([]);
    expect(corsHeaders("https://app.example", [])).toBeNull();
    expect(corsHeaders(null, ["*"])).toBeNull();
  });

  it("allows listed origins without credentials and echoes the origin", () => {
    const allowed = parseCorsOrigins("https://app.example, https://other.example");
    const headers = corsHeaders("https://app.example", allowed);
    expect(headers?.["Access-Control-Allow-Origin"]).toBe("https://app.example");
    expect(headers?.Vary).toBe("Origin");
    expect(headers?.["Access-Control-Allow-Headers"]).toContain("Authorization");
    expect(Object.keys(headers ?? {})).not.toContain("Access-Control-Allow-Credentials");
    expect(corsHeaders("https://evil.example", allowed)).toBeNull();
  });

  it("supports a wildcard", () => {
    expect(corsHeaders("https://anything.example", ["*"])?.["Access-Control-Allow-Origin"]).toBe("*");
  });
});
