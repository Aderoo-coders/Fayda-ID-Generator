export interface IDCardData {
  name_am: string;
  name_en: string;
  dob: string;
  sex: string;
  fin: string;
  fan: string;
  phone: string;
  sn: string;
  date_of_issue: string;
  date_of_expiry: string;
  photo: string | null;
  // Back side fields
  nationality: string;
  region: string;
  zone: string;
  woreda: string;
  kebele: string;
  house_no: string;
  blood_type: string;
  emergency_contact: string;
  address_am: string;
  back_qr_crop: string | null;
}

export interface FaceBBox {
  x: number; y: number; w: number; h: number;
  confidence?: number;
}

/** Canonical nationality on Ethiopian Fayda national ID. */
export const FAYDA_NATIONALITY = 'Ethiopian';

export interface BarcodeInfo {
  rawValue: string;
  format: string;
  side: 'front' | 'back';
  boundingBox?: { x: number; y: number; width: number; height: number };
  /** Cropped ROI image (data URL) for the barcode region */
  roiImage?: string;
  /** Value re-decoded from the cropped ROI (verification) */
  roiRawValue?: string;
  /** Fields that were populated from this barcode's decoded value */
  fieldMappings?: { field: keyof IDCardData; value: string }[];
}

export interface ExtractionResult {
  data: IDCardData;
  confidence: Record<keyof IDCardData, number>;
  barcodes?: BarcodeInfo[];
  aiError?: string;
  /** True when face detection confidence is low or crop is uncertain. */
  faceCropUncertain?: boolean;
  /** Resolved face box (local detection and/or cloud `face_bbox`) for photo crop. */
  aiFaceBBox?: FaceBBox | null;
}

export type WorkflowStep = 'upload' | 'extract' | 'edit' | 'preview' | 'download';
