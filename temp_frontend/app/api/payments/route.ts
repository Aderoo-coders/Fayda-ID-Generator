import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-backend";
import {
  createPayment,
  getApiStore,
  getAuthContext,
} from "@/lib/server-api-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const proxied = await proxyToBackend(req, "payments");
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  const store = getApiStore();
  const list = [...store.payments.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const filtered =
    ctx.role === "admin" ? list : list.filter((p) => p.userId === ctx.userId);

  return NextResponse.json({ payments: filtered });
}

export async function POST(req: NextRequest) {
  const proxied = await proxyToBackend(req, "payments");
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  let body: {
    packageId?: string;
    bankId?: string;
    amount?: number;
    currency?: string;
    reference?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Number(body.amount ?? 0);
  const currency = String(body.currency ?? "USD").trim() || "USD";
  const reference = String(body.reference ?? "").trim();
  if (!reference) {
    return NextResponse.json(
      { error: "reference is required" },
      { status: 400 },
    );
  }

  const row = createPayment({
    userId: ctx.userId,
    packageId: body.packageId ?? null,
    bankId: body.bankId ?? null,
    amount: Number.isFinite(amount) ? amount : 0,
    currency,
    reference,
    status: "pending",
    notes: body.notes,
  });

  return NextResponse.json({ payment: row }, { status: 201 });
}
