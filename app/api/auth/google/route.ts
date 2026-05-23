import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

export const runtime = "nodejs";

function getGoogleClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    ""
  );
}

/** Verifies Google ID token from @react-oauth/google; returns token for `fayda_access_token`. */
export async function POST(req: NextRequest) {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return NextResponse.json(
      { error: "Set GOOGLE_CLIENT_ID or NEXT_PUBLIC_GOOGLE_CLIENT_ID" },
      { status: 503 }
    );
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const idToken = body.token?.trim();
  if (!idToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const client = new OAuth2Client(clientId);
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json({ access: idToken });
  } catch {
    return NextResponse.json({ error: "Invalid Google credential" }, { status: 401 });
  }
}
