import { NextResponse } from "next/server";
import { CollectionValidationError } from "@/modules/collections/queries";

/** Turns a validation failure into a 400 with per-field errors; rethrows anything else. */
export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof CollectionValidationError) {
    return NextResponse.json({ error: error.message, fields: error.fields }, { status: 400 });
  }
  throw error;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
