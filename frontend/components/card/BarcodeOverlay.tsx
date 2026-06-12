import { useRef, useState, useEffect } from 'react';
import type { BarcodeInfo } from '@/types/id-card';

interface Props {
  imageUrl: string;
  barcodes: BarcodeInfo[];
  side: 'front' | 'back';
  label: string;
}

const FIELD_LABELS: Record<string, string> = {
  name_am: 'Name (አማ)', name_en: 'Name (EN)', dob: 'DOB', sex: 'Sex',
  fin: 'FIN', fan: 'FAN', phone: 'Phone', sn: 'S/N',
  date_of_issue: 'Issued', date_of_expiry: 'Expiry',
  nationality: 'Nationality', region: 'Region', zone: 'Zone',
  woreda: 'Woreda', kebele: 'Kebele', house_no: 'House #',
  blood_type: 'Blood', emergency_contact: 'Emergency', address_am: 'Address',
};

export function BarcodeOverlay({ imageUrl, barcodes, side, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number; natW: number; natH: number } | null>(null);
  const filtered = barcodes.filter(b => b.side === side);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({
      w: img.clientWidth,
      h: img.clientHeight,
      natW: img.naturalWidth,
      natH: img.naturalHeight,
    });
  };

  useEffect(() => {
    const obs = new ResizeObserver(() => {
      const img = containerRef.current?.querySelector('img');
      if (img) {
        setImgSize({
          w: img.clientWidth,
          h: img.clientHeight,
          natW: img.naturalWidth,
          natH: img.naturalHeight,
        });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div ref={containerRef} className="relative inline-block w-full">
        <img
          src={imageUrl}
          alt={`${label} card`}
          className="w-full rounded-md border border-border"
          onLoad={handleLoad}
        />
        {imgSize && filtered.map((bc, i) => {
          if (!bc.boundingBox) return null;
          const scaleX = imgSize.w / imgSize.natW;
          const scaleY = imgSize.h / imgSize.natH;
          const left = bc.boundingBox.x * scaleX;
          const top = bc.boundingBox.y * scaleY;
          const width = bc.boundingBox.width * scaleX;
          const height = bc.boundingBox.height * scaleY;
          const hasMappings = bc.fieldMappings && bc.fieldMappings.length > 0;

          return (
            <div key={i}>
              {/* Bounding box */}
              <div
                className={`absolute border-2 rounded-sm pointer-events-none ${hasMappings ? 'border-green-500' : 'border-primary'}`}
                style={{ left, top, width, height }}
              />
              {/* Format label */}
              <div
                className={`absolute text-[10px] leading-tight px-1 py-0.5 rounded-sm max-w-[200px] truncate pointer-events-none ${hasMappings ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'}`}
                style={{ left, top: top + height + 2 }}
                title={bc.rawValue}
              >
                {bc.format.replace(/_/g, ' ')} — {bc.rawValue.slice(0, 40)}
              </div>
              {/* Field mapping tags */}
              {hasMappings && (
                <div
                  className="absolute flex flex-wrap gap-1 pointer-events-none"
                  style={{ left, top: top + height + 18, maxWidth: Math.max(width, 200) }}
                >
                  {bc.fieldMappings!.map((m, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-0.5 text-[9px] leading-tight px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground border border-border"
                      title={`${m.field}: ${m.value}`}
                    >
                      <span className="font-semibold">{FIELD_LABELS[m.field] || m.field}</span>
                      <span className="opacity-70">= {m.value.slice(0, 20)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">No barcodes</span>
          </div>
        )}
      </div>
    </div>
  );
}
