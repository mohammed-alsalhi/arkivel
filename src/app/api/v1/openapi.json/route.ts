import { NextRequest, NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import {
  apiV1Headers,
  createPublicApiV1OpenApiSpec,
  PUBLIC_API_V1_EXAMPLE_BASE_URL,
} from "@/lib/public-api-v1";
import { resolveSiteMode } from "@/lib/site-mode";

export async function GET(request: NextRequest) {
  const disabled = await moduleDisabledResponse("api");
  if (disabled) return disabled;

  const baseUrl = resolveSiteMode(process.env.ARKIVEL_SITE_MODE) === "product"
    ? PUBLIC_API_V1_EXAMPLE_BASE_URL
    : request.nextUrl.origin;
  return NextResponse.json(createPublicApiV1OpenApiSpec(baseUrl), { headers: apiV1Headers });
}

export const dynamic = "force-dynamic";
