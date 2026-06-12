import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-backend";
import { ensureUserExists, getApiStore, getAuthContext } from "@/lib/server-api-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const proxied = await proxyToBackend(req, "users/me/balance");
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  const store = getApiStore();
  let user = ensureUserExists(store, ctx.userId);
  if (!user) {
    user = {
      id: ctx.userId,
      email: `${ctx.userId}@local.dev`,
      credits: 0,
      role: ctx.role,
    };
    store.users.set(user.id, user);
  }

  return NextResponse.json({
    userId: user.id,
    credits: user.credits,
    balance: user.credits,
  });
}
