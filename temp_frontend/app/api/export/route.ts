import { NextResponse } from "next/server";

/** PDF/image export via Puppeteer was disabled; restore server-side rendering here if needed. */
export async function POST() {
  return NextResponse.json(
    { error: "Export is not configured on this deployment." },
    { status: 501 },
  );
}
