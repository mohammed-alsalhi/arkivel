import { NextResponse } from "next/server";
import { moduleDisabledResponse } from "@/modules/enabled";
import { apiV1Headers } from "@/lib/public-api-v1";
import { sdkMetadataContract } from "@/lib/sdk-types";

export async function GET() {
  const disabled = await moduleDisabledResponse("api");
  if (disabled) return disabled;

  return NextResponse.json(sdkMetadataContract, { headers: apiV1Headers });
}

export const dynamic = "force-dynamic";
