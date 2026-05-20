import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-backend";
import { getApiStore, getAuthContext } from "@/lib/server-api-store";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const proxied = await proxyToBackend(req, `jobs/${id}/download`);
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  const store = getApiStore();
  const job = store.jobs.get(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.userId !== ctx.userId && ctx.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (job.status !== "done" || !job.resultFileId) {
    return NextResponse.json(
      { error: "Result not ready", status: job.status },
      { status: 409 },
    );
  }

  const meta = store.files.get(job.resultFileId);
  if (!meta || !existsSync(meta.path)) {
    return NextResponse.json({ error: "Result file missing" }, { status: 404 });
  }

  const buf = await readFile(meta.path);
  const filename = meta.originalName || `job-${id}.pdf`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": meta.mime || "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
