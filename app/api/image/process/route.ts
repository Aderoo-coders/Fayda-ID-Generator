import { NextRequest, NextResponse } from 'next/server';

const MAX_BODY_BYTES = 15 * 1024 * 1024;

/**
 * Proxies portrait processing to the Python FastAPI service (`backend/main.py`).
 * Set `IMAGE_API_URL` (e.g. http://127.0.0.1:8765) in `frontend/.env.local`.
 */
export async function POST(req: NextRequest) {
  const base = process.env.IMAGE_API_URL?.trim();
  if (!base) {
    return NextResponse.json(
      { error: 'IMAGE_API_URL is not configured' },
      { status: 503 },
    );
  }

  const len = req.headers.get('content-length');
  if (len && Number(len) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'auto';
  const target = `${base.replace(/\/$/, '')}/process?mode=${encodeURIComponent(mode)}`;

  try {
    const formData = await req.formData();
    const file = formData.get('image');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Missing image field' }, { status: 400 });
    }

    const upstream = new FormData();
    upstream.append('image', file);

    const res = await fetch(target, {
      method: 'POST',
      body: upstream,
      signal: AbortSignal.timeout(120_000),
    });

    const text = await res.text();
    if (!res.ok) {
      try {
        const err = JSON.parse(text) as { detail?: unknown };
        return NextResponse.json(
          typeof err.detail === 'string' ? { error: err.detail } : { error: text },
          { status: res.status },
        );
      } catch {
        return NextResponse.json({ error: text || res.statusText }, { status: res.status });
      }
    }

    try {
      const json = JSON.parse(text) as { photo?: string; method?: string };
      return NextResponse.json(json);
    } catch {
      return NextResponse.json({ error: 'Invalid upstream response' }, { status: 502 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upstream error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
