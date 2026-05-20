import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-backend";
import { DEFAULT_BANKS } from "@/lib/server-api-store";

export async function GET(req: NextRequest) {
  const proxied = await proxyToBackend(req, "banks");
  if (proxied) return proxied;

  return NextResponse.json({ banks: DEFAULT_BANKS });
}
