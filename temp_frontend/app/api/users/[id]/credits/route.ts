import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-backend";
import {
  getApiStore,
  getAuthContext,
  requireAdmin,
} from "@/lib/server-api-store";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const proxied = await proxyToBackend(req, `users/${id}/credits`);
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  if (!requireAdmin(ctx)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { delta?: number; credits?: number; set?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const store = getApiStore();
  const user = store.users.get(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (body.set !== undefined && Number.isFinite(Number(body.set))) {
    user.credits = Math.max(0, Number(body.set));
  } else if (body.delta !== undefined && Number.isFinite(Number(body.delta))) {
    user.credits = Math.max(0, user.credits + Number(body.delta));
  } else if (body.credits !== undefined && Number.isFinite(Number(body.credits))) {
    user.credits = Math.max(0, Number(body.credits));
  } else {
    return NextResponse.json(
      { error: "Provide set, delta, or credits" },
      { status: 400 },
    );
  }

  store.users.set(id, user);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      credits: user.credits,
      role: user.role,
    },
  });
}
