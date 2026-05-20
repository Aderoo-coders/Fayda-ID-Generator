import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-backend";
import {
  DEFAULT_PACKAGES,
  getApiStore,
  getAuthContext,
  requireAdmin,
} from "@/lib/server-api-store";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const proxied = await proxyToBackend(req, `users/${id}/add-package`);
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  if (!requireAdmin(ctx)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { packageId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const packageId = String(body.packageId ?? "").trim();
  const pkg = DEFAULT_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Unknown packageId" }, { status: 400 });
  }

  const store = getApiStore();
  const user = store.users.get(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  user.credits += pkg.credits;
  store.users.set(id, user);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      credits: user.credits,
      role: user.role,
    },
    package: pkg,
  });
}
