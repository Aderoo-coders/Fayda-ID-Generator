import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/api-backend";
import { createJob, getApiStore, getAuthContext } from "@/lib/server-api-store";

export const runtime = "nodejs";

const UPLOAD_ROOT = join(process.cwd(), ".data", "uploads");
const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const proxied = await proxyToBackend(req, "upload");
  if (proxied) return proxied;

  const ctx = getAuthContext(req);
  const len = req.headers.get("content-length");
  if (len && Number(len) > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  await mkdir(UPLOAD_ROOT, { recursive: true });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file =
    formData.get("file") ??
    formData.get("pdf") ??
    formData.get("document");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "Missing file field (use file, pdf, or document)" },
      { status: 400 },
    );
  }

  const mime = file.type || "application/pdf";
  const nameLower = (file.name || "").toLowerCase();
  const looksPdf =
    mime === "application/pdf" ||
    mime.includes("pdf") ||
    nameLower.endsWith(".pdf");
  if (!looksPdf) {
    return NextResponse.json(
      { error: "Only PDF uploads are accepted" },
      { status: 415 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  const diskPath = join(UPLOAD_ROOT, `${id}.pdf`);
  await writeFile(diskPath, buf);

  const store = getApiStore();
  store.files.set(id, {
    path: diskPath,
    mime,
    originalName: file.name || "upload.pdf",
  });

  const autoJob = formData.get("createJob") === "true" || formData.get("job") === "true";
  let job = null;
  if (autoJob) {
    job = createJob({
      userId: ctx.userId,
      inputFileId: id,
      status: "queued",
      resultFileId: null,
    });
  }

  return NextResponse.json(
    {
      id,
      mime,
      originalName: file.name || "upload.pdf",
      size: buf.length,
      job,
    },
    { status: 201 },
  );
}
