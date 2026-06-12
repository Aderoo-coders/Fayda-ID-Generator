import { NextResponse } from "next/server";

/** Legacy Django upload proxy — use `/api/upload` + `/api/jobs` instead. */
export async function POST() {
  return NextResponse.json(
    { error: "Use POST /api/upload then POST /api/jobs with inputFileId." },
    { status: 410 },
  );
}
