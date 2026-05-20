import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Sparkles, ScanFace, ScanBarcode } from 'lucide-react';
import { extractWithAI } from '@/lib/ai-extract';
// Uses Gemini AI via Lovable AI Gateway + MediaPipe face detection
import { Button } from '@/components/ui/button';
import { BarcodeOverlay } from '@/components/BarcodeOverlay';
import type { ExtractionResult, FaceBBox } from '@/types/id-card';

interface Props {
  imageUrl: string;
  backImageUrl: string;
  onExtracted: (result: ExtractionResult) => void;
  onSkip: () => void;
  cropState?: { bbox: FaceBBox; fit: 'cover' | 'contain' | 'raw' };
  onCropStateChange?: (s: { bbox: FaceBBox; fit: 'cover' | 'contain' | 'raw' }) => void;
}

export function ExtractStep({ imageUrl, backImageUrl, onExtracted, onSkip }: Props) {
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [progress, setProgress] = useState('Analyzing card with AI...');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [result, setResult] = useState<ExtractionResult | null>(null);

  useEffect(() => {
    if (!imageUrl && !backImageUrl) {
      onSkip();
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        setProgress(
          imageUrl && backImageUrl
            ? 'AI is analyzing both sides + detecting face...'
            : 'AI is analyzing your card + detecting face...',
        );
        const merged = await extractWithAI(imageUrl, backImageUrl);
        if (cancelled) return;
        setResult(merged);
        setStatus('done');
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
          setStatus('error');
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, backImageUrl, onSkip]);

  if (status === 'loading') {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="relative w-12 h-12 mx-auto mb-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <Sparkles className="w-5 h-5 text-primary absolute inset-0 m-auto" />
        </div>
        <p className="text-lg font-semibold">Processing your ID...</p>
        <p className="text-sm text-muted-foreground mt-1">{progress}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold">AI extraction failed</p>
        <p className="text-sm text-muted-foreground mt-2">{errorMsg || 'Could not process the image(s).'}</p>
        <Button className="mt-4" onClick={onSkip}>Enter data manually</Button>
      </div>
    );
  }

  const frontCount = imageUrl ? Object.entries(result!.data).filter(([k]) => ['name_am','name_en','dob','sex','fin','fan','phone','sn','date_of_issue','date_of_expiry'].includes(k)).filter(([,v]) => v).length : 0;
  const backCount = backImageUrl ? Object.entries(result!.data).filter(([k]) => ['nationality','region','zone','woreda','kebele','house_no','blood_type','emergency_contact','address_am'].includes(k)).filter(([,v]) => v).length : 0;
  const hasPhoto = !!result!.data.photo;

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div className="text-center">
        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
        <p className="text-lg font-semibold">Extraction complete!</p>
        {(() => {
          const barcodeFilledCount = result!.barcodes?.length
            ? Object.keys(result!.confidence).filter(k => k !== 'photo' && (result!.data as any)[k] && (result!.confidence as any)[k] === 0.75).length
            : 0;
          return (
            <p className="text-sm text-muted-foreground mt-1">
              Found {frontCount + backCount} fields
              {imageUrl && backImageUrl && ` (${frontCount} front, ${backCount} back)`}
              {barcodeFilledCount > 0 && ` · ${barcodeFilledCount} from barcode fallback`}.
            </p>
          );
        })()}
        {result!.aiError && (
          <div className="mt-3 mx-auto max-w-md rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            AI text extraction unavailable ({result!.aiError}). Used barcode + face detection only — please review and complete fields manually.
          </div>
        )}
      </div>

      {imageUrl && (
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
          {hasPhoto ? (
            <img src={result!.data.photo!} alt="Detected face" className="w-16 h-20 object-cover rounded" />
          ) : (
            <div className="w-16 h-20 rounded bg-muted flex items-center justify-center">
              <ScanFace className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {hasPhoto ? 'Face detected automatically' : 'No face detected'}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasPhoto
                ? 'MediaPipe face detector found and cropped your photo.'
                : 'Detector could not find a face — you can continue without a photo.'}
            </p>
          </div>
        </div>
      )}

      {/* Barcode results */}
      {result!.barcodes && result!.barcodes.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-primary" />
            <p className="text-sm font-medium">
              {result!.barcodes.length} barcode{result!.barcodes.length > 1 ? 's' : ''} detected
            </p>
          </div>
          <div className="space-y-2">
            {result!.barcodes.map((bc, i) => (
              <div key={i} className="rounded-md bg-muted p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{bc.format.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-muted-foreground">({bc.side})</span>
                  {bc.roiRawValue && bc.roiRawValue === bc.rawValue && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 font-medium">
                      ROI verified
                    </span>
                  )}
                  {bc.fieldMappings && bc.fieldMappings.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 font-medium">
                      {bc.fieldMappings.length} field{bc.fieldMappings.length > 1 ? 's' : ''} mapped
                    </span>
                  )}
                </div>
                <div className="flex gap-3 items-start">
                  {bc.roiImage && (
                    <img
                      src={bc.roiImage}
                      alt={`Barcode ROI ${i + 1}`}
                      className="h-16 w-auto max-w-[40%] object-contain rounded border border-border bg-background"
                      title="Cropped barcode region (ROI)"
                    />
                  )}
                  <p className="text-sm font-mono break-all select-all flex-1">{bc.rawValue}</p>
                </div>
                {bc.fieldMappings && bc.fieldMappings.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-border">
                    {bc.fieldMappings.map((m, j) => (
                      <span key={j} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground border border-border">
                        <span className="font-semibold">{m.field.replace(/_/g, ' ')}</span>
                        <span className="opacity-60">=</span>
                        <span className="truncate max-w-[120px]">{m.value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result!.barcodes && result!.barcodes.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <ScanBarcode className="w-5 h-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No barcodes detected on the card</p>
        </div>
      )}

      {/* Barcode bounding box overlays on card images */}
      {result!.barcodes && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {imageUrl && (
            <BarcodeOverlay imageUrl={imageUrl} barcodes={result!.barcodes} side="front" label="Front side" />
          )}
          {backImageUrl && (
            <BarcodeOverlay imageUrl={backImageUrl} barcodes={result!.barcodes} side="back" label="Back side" />
          )}
        </div>
      )}

      <div className="text-center">
        <Button onClick={() => onExtracted(result!)}>Continue to Edit</Button>
      </div>
    </div>
  );
}
