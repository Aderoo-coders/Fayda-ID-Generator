/** Must match OAuth Web client IDs in Google Cloud Console (authorized JS origins + redirect URIs). */
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
