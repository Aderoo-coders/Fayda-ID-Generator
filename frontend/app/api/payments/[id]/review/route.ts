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
  const proxied = await proxyToBackend(req, `payments/${id}/review`);
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  if (!requireAdmin(ctx)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { status?: "approved" | "rejected"; adminNotes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const store = getApiStore();
  const payment = store.payments.get(id);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const status = body.status;
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json(
      { error: "status must be approved or rejected" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  payment.status = status;
  payment.adminNotes = body.adminNotes;
  payment.updatedAt = now;

  if (status === "approved" && payment.packageId) {
    const pkg = DEFAULT_PACKAGES.find((p) => p.id === payment.packageId);
    const credits = pkg?.credits ?? 0;
    const user = store.users.get(payment.userId);
    if (user && credits > 0) {
      user.credits += credits;
    }
  }

  store.payments.set(id, payment);

  return NextResponse.json({ payment });
}
