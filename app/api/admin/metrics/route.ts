import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-backend";
import {
  getApiStore,
  getAuthContext,
  requireAdmin,
} from "@/lib/server-api-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const proxied = await proxyToBackend(req, "admin/metrics");
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  if (!requireAdmin(ctx)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const store = getApiStore();
  const users = [...store.users.values()];
  const payments = [...store.payments.values()];
  const jobs = [...store.jobs.values()];

  const totalCredits = users.reduce((s, u) => s + u.credits, 0);
  const pendingPayments = payments.filter((p) => p.status === "pending").length;
  const jobsByStatus = jobs.reduce(
    (acc, j) => {
      acc[j.status] = (acc[j.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return NextResponse.json({
    users: { total: users.length },
    credits: { totalIssuedApprox: totalCredits },
    payments: {
      total: payments.length,
      pending: pendingPayments,
      approved: payments.filter((p) => p.status === "approved").length,
      rejected: payments.filter((p) => p.status === "rejected").length,
    },
    jobs: {
      total: jobs.length,
      byStatus: jobsByStatus,
    },
    generatedAt: new Date().toISOString(),
  });
}
