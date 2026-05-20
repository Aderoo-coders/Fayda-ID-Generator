import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { FaceBBox } from '@/types/id-card';
import type { PhotoSlotFitMode } from '@/lib/photo-fit';
import { clampBBox, cropFaceToDataUrl } from '@/lib/face-crop';
import { Loader2 } from 'lucide-react';

type ResizeMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

function applyResize(mode: ResizeMode, box0: FaceBBox, p: { nx: number; ny: number }): FaceBBox {
  if (mode === 'move') return box0;
  const x0 = box0.x;
  const y0 = box0.y;
  const x1 = box0.x + box0.w;
  const y1 = box0.y + box0.h;

  switch (mode) {
    case 'se':
      return clampBBox({ x: x0, y: y0, w: p.nx - x0, h: p.ny - y0 });
    case 'nw':
      return clampBBox({ x: p.nx, y: p.ny, w: x1 - p.nx, h: y1 - p.ny });
    case 'ne':
      return clampBBox({ x: x0, y: p.ny, w: p.nx - x0, h: y1 - p.ny });
    case 'sw':
      return clampBBox({ x: p.nx, y: y0, w: x1 - p.nx, h: p.ny - y0 });
    case 'e':
      return clampBBox({ x: x0, y: y0, w: p.nx - x0, h: box0.h });
    case 'w':
      return clampBBox({ x: p.nx, y: y0, w: x1 - p.nx, h: box0.h });
    case 's':
      return clampBBox({ x: x0, y: y0, w: box0.w, h: p.ny - y0 });
    case 'n':
      return clampBBox({ x: x0, y: p.ny, w: box0.w, h: y1 - p.ny });
    default:
      return box0;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialBBox: FaceBBox;
  /** Bump to re-sync rectangle from AI/Fayda after reset */
  bboxSeed: number;
  photoSlotFit: PhotoSlotFitMode;
  onPhotoSlotFitChange: (m: PhotoSlotFitMode) => void;
  onApply: (bbox: FaceBBox, photoSlotFit: PhotoSlotFitMode) => Promise<void>;
  onReset: () => Promise<void>;
}

export function FaceCropAdjustDialog({
  open,
  onOpenChange,
  imageUrl,
  initialBBox,
  bboxSeed,
  photoSlotFit,
  onPhotoSlotFitChange,
  onApply,
  onReset,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [norm, setNorm] = useState<FaceBBox>(() => clampBBox(initialBBox));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<'apply' | 'reset' | null>(null);

  useEffect(() => {
    if (!open) return;
    setNorm(clampBBox(initialBBox));
  }, [open, initialBBox.x, initialBBox.y, initialBBox.w, initialBBox.h, bboxSeed]);

  const clientToNorm = useCallback((clientX: number, clientY: number) => {
    const el = imgRef.current;
    if (!el) return { nx: 0, ny: 0 };
    const r = el.getBoundingClientRect();
    const nx = (clientX - r.left) / r.width;
    const ny = (clientY - r.top) / r.height;
    return {
      nx: Math.max(0, Math.min(1, nx)),
      ny: Math.max(0, Math.min(1, ny)),
    };
  }, []);

  useEffect(() => {
    if (!open || !imageUrl) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      cropFaceToDataUrl(imageUrl, norm, 0, 0)
        .then((url) => {
          if (!cancelled) setPreviewUrl(url);
        })
        .catch(() => {
          if (!cancelled) setPreviewUrl(null);
        });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, imageUrl, norm]);

  const startDrag = (mode: ResizeMode, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const start = clientToNorm(e.clientX, e.clientY);
    const box0 = { ...norm };

    const onMove = (ev: PointerEvent) => {
      const p = clientToNorm(ev.clientX, ev.clientY);
      if (mode === 'move') {
        const dnx = p.nx - start.nx;
        const dny = p.ny - start.ny;
        setNorm(
          clampBBox({
            x: box0.x + dnx,
            y: box0.y + dny,
            w: box0.w,
            h: box0.h,
          }),
        );
      } else {
        setNorm(applyResize(mode, box0, p));
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleApply = async () => {
    setBusy('apply');
    try {
      await onApply(norm, photoSlotFit);
      onOpenChange(false);
    } finally {
      setBusy(null);
    }
  };

  const handleReset = async () => {
    setBusy('reset');
    try {
      await onReset();
    } finally {
      setBusy(null);
    }
  };

  const handles: { key: ResizeMode; className: string }[] = [
    { key: 'nw', className: 'left-0 top-0 z-10 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
    { key: 'n', className: 'left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize' },
    { key: 'ne', className: 'right-0 top-0 z-10 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
    { key: 'e', className: 'right-0 top-1/2 z-10 translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
    { key: 'se', className: 'right-0 bottom-0 z-10 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' },
    { key: 's', className: 'left-1/2 bottom-0 z-10 -translate-x-1/2 translate-y-1/2 cursor-ns-resize' },
    { key: 'sw', className: 'left-0 bottom-0 z-10 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
    { key: 'w', className: 'left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[min(96vw,52rem)]">
        <DialogHeader>
          <DialogTitle>Adjust face crop</DialogTitle>
          <DialogDescription>
            Drag the rectangle to move it, or use the handles to resize. Coordinates match the front
            photo region used for the card portrait.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[1fr,200px] sm:items-start">
          <div className="relative inline-block max-w-full select-none">
            <img
              ref={imgRef}
              src={imageUrl}
              alt="ID front"
              draggable={false}
              className="block max-h-[55vh] w-auto max-w-full rounded-md border bg-muted"
            />
            <div
              className="pointer-events-none absolute rounded border-2 border-primary shadow-[0_0_0_1px_rgba(255,255,255,0.85)_inset]"
              style={{
                left: `${norm.x * 100}%`,
                top: `${norm.y * 100}%`,
                width: `${norm.w * 100}%`,
                height: `${norm.h * 100}%`,
              }}
            >
              <div
                className="pointer-events-auto absolute inset-2 z-[1] cursor-move touch-none"
                onPointerDown={(e) => startDrag('move', e)}
              />
              {handles.map(({ key, className }) => (
                <div
                  key={key}
                  className={`pointer-events-auto absolute h-3 w-3 rounded-sm border-2 border-primary bg-background touch-none ${className}`}
                  onPointerDown={(e) => startDrag(key, e)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground">Crop preview</p>
            <div className="aspect-square w-full overflow-hidden rounded-md border bg-background">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  …
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Photo in card slot</Label>
              <RadioGroup
                value={photoSlotFit}
                onValueChange={(v) => onPhotoSlotFitChange(v as PhotoSlotFitMode)}
                className="flex gap-3"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="cover" id="fc-cover" />
                  <Label htmlFor="fc-cover" className="cursor-pointer text-sm font-normal">
                    Cover
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="contain" id="fc-contain" />
                  <Label htmlFor="fc-contain" className="cursor-pointer text-sm font-normal">
                    Contain
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" disabled={!!busy} onClick={() => void handleReset()}>
            {busy === 'reset' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Reset to AI detection
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={!!busy}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleApply()} disabled={!!busy}>
              {busy === 'apply' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Apply crop
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
