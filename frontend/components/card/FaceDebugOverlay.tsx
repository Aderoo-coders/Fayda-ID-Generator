import { useEffect, useRef, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { FaceBBox } from '@/types/id-card';
import { FAYDA_PHOTO_BBOX } from '@/engines/detection/face-crop';

export { FAYDA_PHOTO_BBOX };

interface Props {
  imageUrl: string;
  aiBBox?: FaceBBox;
  fallbackBBox?: FaceBBox;
}

/**
 * Renders the front image with two overlay rectangles:
 *   - AI-detected face bbox (cyan)
 *   - Fallback Fayda photo region (magenta, dashed)
 * Coordinates are normalized 0..1 against the rendered image size, so the
 * overlay scales correctly regardless of source resolution.
 */
export function FaceDebugOverlay({
  imageUrl,
  aiBBox,
  fallbackBBox = FAYDA_PHOTO_BBOX,
}: Props) {
  const [enabled, setEnabled] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      const img = imgRef.current;
      if (img) setSize({ w: img.clientWidth, h: img.clientHeight });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [enabled, imageUrl]);

  if (!imageUrl) return null;

  const toBox = (b: FaceBBox) => ({
    left: `${b.x * 100}%`,
    top: `${b.y * 100}%`,
    width: `${b.w * 100}%`,
    height: `${b.h * 100}%`,
  });

  return (
    <div className="border rounded-lg bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="debug-overlay" className="text-sm font-medium cursor-pointer">
          Debug: show face bbox overlay
        </Label>
        <Switch id="debug-overlay" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <>
          <div className="relative inline-block max-w-full">
            <img
              ref={imgRef}
              src={imageUrl}
              alt="ID front with debug overlay"
              className="block max-w-full h-auto rounded"
              onLoad={(e) => {
                const el = e.currentTarget;
                setSize({ w: el.clientWidth, h: el.clientHeight });
              }}
            />
            {size.w > 0 && (
              <>
                {/* Fallback Fayda region (magenta, dashed) */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    ...toBox(fallbackBBox),
                    border: '2px dashed hsl(320, 90%, 55%)',
                    boxShadow: '0 0 0 1px hsl(0, 0%, 100% / 0.4) inset',
                  }}
                >
                  <span className="absolute -top-5 left-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[hsl(320,90%,55%)] text-white whitespace-nowrap">
                    Fallback (Fayda spec)
                  </span>
                </div>

                {/* AI-detected bbox (cyan, solid) */}
                {aiBBox && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      ...toBox(aiBBox),
                      border: '2px solid hsl(190, 95%, 50%)',
                      boxShadow: '0 0 0 1px hsl(220, 30%, 10% / 0.4) inset',
                    }}
                  >
                    <span className="absolute -bottom-5 left-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[hsl(190,95%,50%)] text-[hsl(220,30%,10%)] whitespace-nowrap">
                      AI bbox{typeof aiBBox.confidence === 'number' ? ` · ${Math.round(aiBBox.confidence * 100)}%` : ''}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm border-2 border-[hsl(190,95%,50%)]" />
              AI detection
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm border-2 border-dashed border-[hsl(320,90%,55%)]" />
              Fixed Fayda region (26.8% / 13.5% / 43.5% × 34.1%)
            </span>
            {!aiBBox && (
              <span className="text-[hsl(38,92%,50%)]">No AI bbox returned — fallback will be used.</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
