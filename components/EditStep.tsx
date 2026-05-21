import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { IDCardData } from '@/types/id-card';
import { cropFrontPortraitFromImage } from '@/lib/ocr';
import { processPortraitRemote } from '@/lib/portrait-api';
import type { PhotoSlotFitMode } from '@/lib/photo-fit';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface Props {
  data: IDCardData;
  confidence: Record<keyof IDCardData, number>;
  faceCropUncertain?: boolean;
  photoSlotFit: PhotoSlotFitMode;
  onPhotoSlotFitChange: (mode: PhotoSlotFitMode) => void;
  onManualPhotoReplace?: () => void;
  onChange: (data: IDCardData) => void;
  onNext: () => void;
}

const requiredFields: { key: keyof IDCardData; label: string }[] = [
  { key: 'name_en', label: 'Full Name (English)' },
  { key: 'name_am', label: 'Full Name (Amharic)' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'sex', label: 'Sex' },
  { key: 'fin', label: 'FIN (ID Number)' },
];

const frontFields: { key: keyof IDCardData; label: string; placeholder: string; ethiopic?: boolean }[] = [
  { key: 'name_am', label: 'Full Name (Amharic)', placeholder: 'ሙሉ ስም', ethiopic: true },
  { key: 'name_en', label: 'Full Name (English)', placeholder: 'Full Name' },
  { key: 'dob', label: 'Date of Birth', placeholder: 'DD/MM/YYYY' },
  { key: 'sex', label: 'Sex', placeholder: '' },
  { key: 'fin', label: 'FIN (ID Number)', placeholder: '0000-0000-0000' },
  { key: 'fan', label: 'FAN (Card Number)', placeholder: '0000 0000 0000 0000' },
  { key: 'phone', label: 'Phone Number', placeholder: '+251 9XX XXX XXX' },
  { key: 'sn', label: 'Serial Number', placeholder: 'SN000000' },
  { key: 'date_of_issue', label: 'Date of Issue', placeholder: 'DD/MM/YYYY' },
  { key: 'date_of_expiry', label: 'Date of Expiry', placeholder: 'DD/MM/YYYY' },
];

const backFields: { key: keyof IDCardData; label: string; placeholder: string; ethiopic?: boolean }[] = [
  { key: 'nationality', label: 'Nationality', placeholder: 'Ethiopian' },
  { key: 'region', label: 'Region', placeholder: 'e.g. Addis Ababa' },
  { key: 'zone', label: 'Zone', placeholder: 'Zone' },
  { key: 'woreda', label: 'Woreda', placeholder: 'Woreda' },
  { key: 'kebele', label: 'Kebele', placeholder: 'Kebele' },
  // { key: 'house_no', label: 'House Number', placeholder: 'House No.' },
  // { key: 'address_am', label: 'Address (Amharic)', placeholder: 'አድራሻ', ethiopic: true },
  // { key: 'blood_type', label: 'Blood Type', placeholder: 'A+, B-, O+, AB+' },
  // { key: 'emergency_contact', label: 'Emergency Contact', placeholder: '+251 9XX XXX XXX' },
];

export function EditStep({
  data,
  confidence,
  faceCropUncertain,
  photoSlotFit,
  onPhotoSlotFitChange,
  onManualPhotoReplace,
  onChange,
  onNext,
}: Props) {
  const [localData, setLocalData] = useState(data);
  const [errors, setErrors] = useState<Set<keyof IDCardData>>(new Set());
  const { toast } = useToast();

  const handleNext = () => {
    const missing = requiredFields.filter(f => !localData[f.key]?.toString().trim());
    if (missing.length > 0) {
      setErrors(new Set(missing.map(f => f.key)));
      toast({
        title: 'Missing required fields',
        description: missing.map(f => f.label).join(', '),
        variant: 'destructive',
      });
      return;
    }
    setErrors(new Set());
    onNext();
  };

  const update = useCallback(
    (key: keyof IDCardData, value: string) => {
      const next = { ...localData, [key]: value };
      setLocalData(next);
      onChange(next);
    },
    [localData, onChange]
  );

  const handlePhotoChange = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const full = ev.target?.result as string;
        const remote = await processPortraitRemote(full, 'auto');
        const cropped = remote?.photoDataUrl ?? (await cropFrontPortraitFromImage(full));
        update('photo', cropped ?? full);
        onManualPhotoReplace?.();
      };
      reader.readAsDataURL(f);
    };
    input.click();
  };

  const renderFields = (fields: typeof frontFields) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map((field) => {
        const isLow = confidence[field.key] > 0 && confidence[field.key] < 0.6;
        const hasError = errors.has(field.key);
        if (field.key === 'sex') {
          return (
            <div key={field.key} className="space-y-1.5">
              <Label className={`text-sm font-medium ${hasError ? 'text-destructive' : ''}`}>
                {field.label} {requiredFields.some(r => r.key === field.key) && <span className="text-destructive">*</span>}
              </Label>
              <Select value={localData.sex} onValueChange={(v: string) => { update('sex', v); setErrors(prev => { const n = new Set(prev); n.delete('sex'); return n; }); }}>
                <SelectTrigger className={hasError ? 'border-destructive' : ''}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
              {hasError && <p className="text-xs text-destructive">Required</p>}
            </div>
          );
        }
        if (field.key === 'photo') return null;
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className={`text-sm font-medium flex items-center gap-1.5 ${hasError ? 'text-destructive' : ''}`}>
              {field.label}
              {requiredFields.some(r => r.key === field.key) && <span className="text-destructive">*</span>}
              {isLow && <AlertTriangle className="w-3.5 h-3.5 text-warning" />}
            </Label>
            <Input
              className={`${field.ethiopic ? 'font-ethiopic' : ''} ${hasError ? 'border-destructive' : ''}`}
              value={(localData[field.key] as string) || ''}
              placeholder={field.placeholder}
              onChange={(e) => { update(field.key, e.target.value); setErrors(prev => { const n = new Set(prev); n.delete(field.key); return n; }); }}
            />
            {hasError && <p className="text-xs text-destructive">Required</p>}
            {isLow && !hasError && (
              <p className="text-xs text-warning">Low confidence — please verify</p>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Front Side</h3>
      {renderFields(frontFields)}

      {(faceCropUncertain || photoSlotFit === 'contain') && (
        <div className="my-6 rounded-lg border bg-muted/40 p-4 space-y-3">
          <div>
            <p className="text-sm font-medium">
              {faceCropUncertain ? 'Face crop uncertain' : 'Photo frame fit'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Fit the photo inside the card&apos;s fixed photo frame: Cover fills the frame (may crop edges).
              Contain shows the whole crop with letterboxing.
            </p>
          </div>
          <ToggleGroup
            type="single"
            value={photoSlotFit}
            onValueChange={(v) => {
              if (v) onPhotoSlotFitChange(v as PhotoSlotFitMode);
            }}
            variant="outline"
            size="sm"
            className="justify-start"
          >
            <ToggleGroupItem value="cover" aria-label="Cover — fill frame">
              Cover
            </ToggleGroupItem>
            <ToggleGroupItem value="contain" aria-label="Contain — letterbox">
              Contain
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      <div className="my-6 border-t pt-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Back Side</h3>
        {renderFields(backFields)}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex items-center gap-3">
          {localData.photo ? (
            <img src={localData.photo} alt="Face" className="w-16 h-20 object-cover rounded-md border" />
          ) : (
            <div className="w-16 h-20 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
              No photo
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handlePhotoChange}>
            {localData.photo ? 'Change Photo' : 'Upload Photo'}
          </Button>
        </div>
        <div className="flex-1" />
        <Button onClick={handleNext} size="lg">Preview ID Card</Button>
      </div>
    </div>
  );
}
