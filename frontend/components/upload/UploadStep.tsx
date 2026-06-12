import { useCallback, useState } from 'react';
import { Upload, ImageIcon, RotateCcw, FileText, Loader2, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { renderPdfPageToImage, getPdfPageCount } from '@/lib/pdf-to-image';

interface Props {
  onImageUploaded: (frontUrl: string, backUrl: string) => void;
}

type UploadMode = 'image' | 'pdf';

export function UploadStep({ onImageUploaded }: Props) {
  const [mode, setMode] = useState<UploadMode>('image');

  // Image mode state
  const [dragOverFront, setDragOverFront] = useState(false);
  const [dragOverBack, setDragOverBack] = useState(false);
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');

  // PDF mode state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfFrontPage, setPdfFrontPage] = useState(1);
  const [pdfBackPage, setPdfBackPage] = useState(2);
  const [pdfFrontPreview, setPdfFrontPreview] = useState('');
  const [pdfBackPreview, setPdfBackPreview] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [dragOverPdf, setDragOverPdf] = useState(false);
  const [showPagePicker, setShowPagePicker] = useState(false);

  // ── Image helpers ─────────────────────────────────────────────
  const readFile = (file: File): Promise<string> =>
    new Promise((resolve) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) resolve(e.target.result as string);
      };
      reader.readAsDataURL(file);
    });

  const pickFile = (cb: (url: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) cb(await readFile(f));
    };
    input.click();
  };

  const handleDrop = async (e: React.DragEvent, cb: (url: string) => void) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) cb(await readFile(f));
  };

  // ── PDF helpers ───────────────────────────────────────────────
  const processPdf = useCallback(async (file: File) => {
    setPdfFile(file);
    setPdfLoading(true);
    setPdfError('');
    setPdfFrontPreview('');
    setPdfBackPreview('');
    setShowPagePicker(false);

    try {
      const pages = await getPdfPageCount(file);
      setPdfPageCount(pages);
      setPdfFrontPage(1);
      setPdfBackPage(Math.min(2, pages));

      // Render page 1 as front
      const front = await renderPdfPageToImage(file, 1);
      setPdfFrontPreview(front);

      // Render page 2 as back (if exists)
      if (pages >= 2) {
        const back = await renderPdfPageToImage(file, 2);
        setPdfBackPreview(back);
      }
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Failed to process PDF');
    } finally {
      setPdfLoading(false);
    }
  }, []);

  const handlePdfPageChange = useCallback(async (side: 'front' | 'back', page: number) => {
    if (!pdfFile || page < 1 || page > pdfPageCount) return;
    setPdfLoading(true);
    try {
      const img = await renderPdfPageToImage(pdfFile, page);
      if (side === 'front') {
        setPdfFrontPage(page);
        setPdfFrontPreview(img);
      } else {
        setPdfBackPage(page);
        setPdfBackPreview(img);
      }
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Failed to render page');
    } finally {
      setPdfLoading(false);
    }
  }, [pdfFile, pdfPageCount]);

  const pickPdf = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) await processPdf(f);
    };
    input.click();
  };

  const handlePdfDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPdf(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') {
      await processPdf(f);
    } else {
      setPdfError('Please drop a PDF file.');
    }
  };

  const clearPdf = () => {
    setPdfFile(null);
    setPdfPageCount(0);
    setPdfFrontPreview('');
    setPdfBackPreview('');
    setPdfError('');
    setShowPagePicker(false);
  };

  const handleContinue = () => {
    if (mode === 'image') {
      onImageUploaded(frontUrl, backUrl);
    } else {
      onImageUploaded(pdfFrontPreview, pdfBackPreview);
    }
  };

  const hasContent = mode === 'image'
    ? (frontUrl || backUrl)
    : (pdfFrontPreview || pdfBackPreview);

  // ── Shared drop zone renderer ─────────────────────────────────
  const dropZone = (
    label: string,
    sublabel: string,
    dragOver: boolean,
    setDrag: (v: boolean) => void,
    preview: string,
    onFile: (url: string) => void,
    onClear: () => void,
  ) => (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground mb-2 text-center">{label}</p>
      {preview ? (
        <div className="relative border-2 border-primary/30 rounded-xl overflow-hidden group cursor-pointer"
          onClick={() => pickFile(onFile)}
        >
          <img src={preview} alt={label} className="w-full h-48 object-contain bg-muted/30" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-sm text-white font-medium">Click to replace</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { setDrag(false); handleDrop(e, onFile); }}
          onClick={() => pickFile(onFile)}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{sublabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG supported</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── PDF page selector button ──────────────────────────────────
  const pageSelector = (label: string, currentPage: number, side: 'front' | 'back') => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">{label}:</span>
      <div className="inline-flex items-center rounded-lg border border-border bg-card">
        <button
          className="px-2 py-1 text-xs hover:bg-muted rounded-l-lg transition-colors disabled:opacity-30"
          disabled={currentPage <= 1 || pdfLoading}
          onClick={() => handlePdfPageChange(side, currentPage - 1)}
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <span className="px-2 py-1 text-xs font-semibold text-foreground min-w-[3rem] text-center">
          Page {currentPage}
        </span>
        <button
          className="px-2 py-1 text-xs hover:bg-muted rounded-r-lg transition-colors disabled:opacity-30"
          disabled={currentPage >= pdfPageCount || pdfLoading}
          onClick={() => handlePdfPageChange(side, currentPage + 1)}
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Mode switcher tabs */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex rounded-xl bg-muted p-1 gap-1">
          <button
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              mode === 'image'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setMode('image')}
          >
            <Camera className="w-4 h-4" />
            Image Upload
          </button>
          <button
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              mode === 'pdf'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setMode('pdf')}
          >
            <FileText className="w-4 h-4" />
            PDF Upload
          </button>
        </div>
      </div>

      {/* Image upload mode */}
      {mode === 'image' && (
        <div className="flex gap-4">
          {dropZone('Front Side', 'Drop front image', dragOverFront, setDragOverFront, frontUrl, setFrontUrl, () => setFrontUrl(''))}
          {dropZone('Back Side', 'Drop back image', dragOverBack, setDragOverBack, backUrl, setBackUrl, () => setBackUrl(''))}
        </div>
      )}

      {/* PDF upload mode */}
      {mode === 'pdf' && (
        <div className="space-y-4">
          {!pdfFile ? (
            /* PDF drop zone */
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                dragOverPdf ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOverPdf(true); }}
              onDragLeave={() => setDragOverPdf(false)}
              onDrop={handlePdfDrop}
              onClick={pickPdf}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Drop your PDF here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Page 1 → Front Side &nbsp;·&nbsp; Page 2 → Back Side
                  </p>
                </div>
              </div>
            </div>
          ) : pdfLoading ? (
            /* PDF loading state */
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Rendering PDF pages…</p>
            </div>
          ) : (
            /* PDF previews */
            <div className="space-y-4">
              {/* File info bar */}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{pdfFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {pdfPageCount} page{pdfPageCount !== 1 ? 's' : ''} · {(pdfFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  onClick={clearPdf}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Remove PDF"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Page picker toggle */}
              {pdfPageCount > 2 && (
                <button
                  className="flex items-center gap-1.5 text-xs text-primary font-medium mx-auto hover:underline"
                  onClick={() => setShowPagePicker(!showPagePicker)}
                >
                  {showPagePicker ? 'Hide' : 'Change'} page assignments
                  {showPagePicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}

              {showPagePicker && pdfPageCount > 2 && (
                <div className="flex items-center justify-center gap-6 py-2 px-4 rounded-lg bg-muted/50 border border-border">
                  {pageSelector('Front', pdfFrontPage, 'front')}
                  {pageSelector('Back', pdfBackPage, 'back')}
                </div>
              )}

              {/* Side-by-side previews */}
              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-2 text-center">
                    Front Side
                    <span className="text-xs font-normal text-muted-foreground ml-1">(p.{pdfFrontPage})</span>
                  </p>
                  {pdfFrontPreview ? (
                    <div className="border-2 border-primary/30 rounded-xl overflow-hidden">
                      <img src={pdfFrontPreview} alt="Front page" className="w-full h-48 object-contain bg-muted/30" />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
                      <p className="text-xs text-muted-foreground">No front page</p>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground mb-2 text-center">
                    Back Side
                    <span className="text-xs font-normal text-muted-foreground ml-1">(p.{pdfBackPage})</span>
                  </p>
                  {pdfBackPreview ? (
                    <div className="border-2 border-primary/30 rounded-xl overflow-hidden">
                      <img src={pdfBackPreview} alt="Back page" className="w-full h-48 object-contain bg-muted/30" />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
                      <p className="text-xs text-muted-foreground">No back page</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {pdfError && (
            <p className="text-sm text-destructive text-center">{pdfError}</p>
          )}
        </div>
      )}

      {/* Continue button */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <Button
          onClick={handleContinue}
          disabled={!hasContent}
          size="lg"
        >
          Continue with uploaded {mode === 'pdf' ? 'PDF' : 'images'}
        </Button>
      </div>

      {/* Skip / manual entry */}
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">Or skip upload and</p>
        <Button variant="link" className="text-primary" onClick={() => onImageUploaded('', '')}>
          <ImageIcon className="w-4 h-4 mr-1" /> Enter data manually
        </Button>
      </div>
    </div>
  );
}
