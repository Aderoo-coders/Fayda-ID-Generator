import { copyFile, mkdir } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-backend";
import {
  createJob,
  getApiStore,
  getAuthContext,
} from "@/lib/server-api-store";

export const runtime = "nodejs";

const RESULT_ROOT = join(process.cwd(), ".data", "results");

export async function GET(req: NextRequest) {
  const proxied = await proxyToBackend(req, "jobs");
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  const store = getApiStore();
  const list = [...store.jobs.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const filtered =
    ctx.role === "admin" ? list : list.filter((j) => j.userId === ctx.userId);

  return NextResponse.json({ jobs: filtered });
}

export async function POST(req: NextRequest) {
  const proxied = await proxyToBackend(req, "jobs");
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  let body: { inputFileId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const inputFileId = String(body.inputFileId ?? "").trim();
  if (!inputFileId) {
    return NextResponse.json({ error: "inputFileId is required" }, { status: 400 });
  }

  const store = getApiStore();
  const fileMeta = store.files.get(inputFileId);
  if (!fileMeta) {
    return NextResponse.json({ error: "Unknown inputFileId" }, { status: 404 });
  }

  const job = createJob({
    userId: ctx.userId,
    inputFileId,
    status: "processing",
    resultFileId: null,
  });

  await mkdir(RESULT_ROOT, { recursive: true });
  const resultId = `${job.id}-result.pdf`;
  const resultPath = join(RESULT_ROOT, resultId);
  await copyFile(fileMeta.path, resultPath);

  job.status = "done";
  job.resultFileId = resultId;
  job.updatedAt = new Date().toISOString();
  store.files.set(resultId, {
    path: resultPath,
    mime: "application/pdf",
    originalName: `processed-${inputFileId}.pdf`,
  });
  store.jobs.set(job.id, job);

  return NextResponse.json({ job }, { status: 201 });
}
