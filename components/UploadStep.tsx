import { useCallback, useState } from 'react';
import { Upload, ImageIcon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onImageUploaded: (frontUrl: string, backUrl: string) => void;
}

export function UploadStep({ onImageUploaded }: Props) {
  const [dragOverFront, setDragOverFront] = useState(false);
  const [dragOverBack, setDragOverBack] = useState(false);
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');

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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-4">
        {dropZone('Front Side', 'Drop front image', dragOverFront, setDragOverFront, frontUrl, setFrontUrl, () => setFrontUrl(''))}
        {dropZone('Back Side', 'Drop back image', dragOverBack, setDragOverBack, backUrl, setBackUrl, () => setBackUrl(''))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <Button
          onClick={() => onImageUploaded(frontUrl, backUrl)}
          disabled={!frontUrl && !backUrl}
          size="lg"
        >
          Continue with uploaded images
        </Button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">Or skip upload and</p>
        <Button variant="link" className="text-primary" onClick={() => onImageUploaded('', '')}>
          <ImageIcon className="w-4 h-4 mr-1" /> Enter data manually
        </Button>
      </div>
    </div>
  );
}
