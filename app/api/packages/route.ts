import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-backend";
import { DEFAULT_PACKAGES } from "@/lib/server-api-store";

export async function GET(req: NextRequest) {
  const proxied = await proxyToBackend(req, "packages");
  if (proxied) return proxied;

  return NextResponse.json({ packages: DEFAULT_PACKAGES });
}
