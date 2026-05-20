import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-backend";
import {
  getApiStore,
  getAuthContext,
  requireAdmin,
} from "@/lib/server-api-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const proxied = await proxyToBackend(req, "users");
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  if (!requireAdmin(ctx)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const store = getApiStore();
  const users = [...store.users.values()].map((u) => ({
    id: u.id,
    email: u.email,
    credits: u.credits,
    role: u.role,
  }));

  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const proxied = await proxyToBackend(req, "users");
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  if (!requireAdmin(ctx)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    userId?: string;
    email?: string;
    credits?: number;
    role?: "user" | "admin";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = String(body.userId ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const store = getApiStore();
  const user = store.users.get(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (body.email !== undefined) user.email = String(body.email).trim();
  if (body.credits !== undefined && Number.isFinite(Number(body.credits))) {
    user.credits = Math.max(0, Number(body.credits));
  }
  if (body.role === "user" || body.role === "admin") user.role = body.role;

  store.users.set(userId, user);

  return NextResponse.json({ user });
}
