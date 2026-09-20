import { NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import { apiV1Headers, publicApiV1Contract } from "@/lib/public-api-v1";

export async function GET() {
  const disabled = await moduleDisabledResponse("api");
  if (disabled) return disabled;

  return NextResponse.json(publicApiV1Contract, { headers: apiV1Headers });
}

export const dynamic = "force-dynamic";
