"use client";

import { useState, useRef, useCallback } from 'react';
import { StepIndicator } from '@/components/layout/StepIndicator';
import { UploadStep } from '@/components/upload/UploadStep';
import { ExtractStep } from '@/components/card/ExtractStep';
import { EditStep } from '@/components/card/EditStep';
import { PreviewStep } from '@/components/card/PreviewStep';
import { DownloadStep } from '@/components/card/DownloadStep';
import { IDCardPreview } from '@/components/card/id-card-preview';
import { IDCardBackPreview } from '@/components/card/id-card-back-preview';

import type { IDCardData, ExtractionResult, WorkflowStep } from '@/types/id-card';
import type { PhotoSlotFitMode } from '@/lib/photo-fit';

const emptyData: IDCardData = {
  name_am: '', name_en: '', dob: '', sex: '', fin: '', fan: '', phone: '', sn: '',
  date_of_issue: '', date_of_expiry: '', photo: null,
  nationality: '', region: '', zone: '', woreda: '', kebele: '', house_no: '',
  blood_type: '', emergency_contact: '', address_am: '',
  back_qr_crop: null,
};

const emptyConfidence: Record<keyof IDCardData, number> = {
  name_am: 0, name_en: 0, dob: 0, sex: 0, fin: 0, fan: 0, phone: 0, sn: 0,
  date_of_issue: 0, date_of_expiry: 0, photo: 0,
  nationality: 0, region: 0, zone: 0, woreda: 0, kebele: 0, house_no: 0,
  blood_type: 0, emergency_contact: 0, address_am: 0,
  back_qr_crop: 0,
};

export default function IdGeneratorHome() {
  const [step, setStep] = useState<WorkflowStep>('upload');
  const [completed, setCompleted] = useState<WorkflowStep[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [backImageUrl, setBackImageUrl] = useState('');
  const [data, setData] = useState<IDCardData>(emptyData);
  const [confidence, setConfidence] = useState(emptyConfidence);
  const [qrValue, setQrValue] = useState<string | undefined>(undefined);
  const [photoSlotFit, setPhotoSlotFit] = useState<PhotoSlotFitMode>('cover');
  const [faceCropUncertain, setFaceCropUncertain] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null!);
  const backCardRef = useRef<HTMLDivElement>(null!);

  const complete = (s: WorkflowStep) => setCompleted((p) => (p.includes(s) ? p : [...p, s]));

  const handleUpload = useCallback((frontUrl: string, backUrl: string) => {
    setImageUrl(frontUrl);
    setBackImageUrl(backUrl);
    complete('upload');
    const hasImage = frontUrl || backUrl;
    setStep(hasImage ? 'extract' : 'edit');
    if (!hasImage) complete('extract');
  }, []);

  const handleExtracted = useCallback((result: ExtractionResult) => {
    setData(result.data);
    setConfidence(result.confidence);
    setFaceCropUncertain(!!result.faceCropUncertain);
    const decodedQr = result.barcodes?.find(
      (b) => b.format === 'qr_code' && b.rawValue,
    )?.rawValue;
    setQrValue(decodedQr);
    complete('extract');
    setStep('edit');
  }, []);

  const handleSkipExtract = useCallback(() => {
    complete('extract');
    setStep('edit');
  }, []);

  const handleSaveToHistory = useCallback(() => {
    const cardId = `${data.fin}_${Date.now()}`;
    const processedCard = {
      id: cardId,
      data,
      createdAt: new Date().toISOString(),
      thumbnail: data.photo || undefined,
    };

    const stored = localStorage.getItem('processedIDCards');
    const existing = stored ? JSON.parse(stored) : [];
    const updated = [processedCard, ...existing].slice(0, 50);
    localStorage.setItem('processedIDCards', JSON.stringify(updated));

    // Auto-send to Telegram if enabled
    const deliveryConfig = localStorage.getItem('telegramDeliveryConfig');
    if (deliveryConfig) {
      try {
        const config = JSON.parse(deliveryConfig);
        if (config.isLinked && config.autoSendEnabled && config.chatId) {
          sendToTelegram(data, config.chatId);
        }
      } catch (error) {
        console.error('Failed to parse delivery config:', error);
      }
    }

    setShowHistory(true);
  }, [data]);

  const sendToTelegram = useCallback(async (cardData: IDCardData, chatId: string) => {
    try {
      const message = `
📋 ID Card Generated Successfully

Name (EN): ${cardData.name_en}
Name (AM): ${cardData.name_am}
FIN: ${cardData.fin}
FAN: ${cardData.fan}
Date of Birth: ${cardData.dob}
Sex: ${cardData.sex}

This card has been automatically delivered to you.
`.trim();

      await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          message,
          cardData,
        }),
      });
    } catch (error) {
      console.error('Failed to send to Telegram:', error);
    }
  }, []);

  const handleSelectFromHistory = useCallback((card: any) => {
    setData(card.data);
    setStep('download');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              ID
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Ethiopian Digital ID Generator</h1>
              <p className="text-xs text-muted-foreground">AI-powered ID card creation</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <StepIndicator currentStep={step} completedSteps={completed} />

        {step === 'upload' && <UploadStep onImageUploaded={handleUpload} />}

        {step === 'extract' && (
          <ExtractStep imageUrl={imageUrl} backImageUrl={backImageUrl} onExtracted={handleExtracted} onSkip={handleSkipExtract} />
        )}

        {step === 'edit' && (
          <EditStep
            data={data}
            confidence={confidence}
            faceCropUncertain={faceCropUncertain}
            photoSlotFit={photoSlotFit}
            onPhotoSlotFitChange={setPhotoSlotFit}
            onManualPhotoReplace={() => setFaceCropUncertain(false)}
            onChange={setData}
            onNext={() => { complete('edit'); setStep('preview'); }}
          />
        )}

        {step === 'preview' && (
          <PreviewStep
            data={data}
            qrValue={qrValue}
            onBack={() => setStep('edit')}
            onDownload={() => { complete('preview'); setStep('download'); }}
            cardRef={cardRef}
            backCardRef={backCardRef}
          />
        )}

        {step === 'download' && (
          <>
            <div className="overflow-x-auto pb-4 space-y-6">
              <IDCardPreview data={data} cardRef={cardRef} />
              <IDCardBackPreview data={data} qrValue={qrValue} backCardRef={backCardRef} />
            </div>
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              <DownloadStep cardRef={cardRef} backCardRef={backCardRef} />
            </div>
            <button
              onClick={() => {
                handleSaveToHistory();
              }}
              className="mx-auto block px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Save to History
            </button>
          </>
        )}
      </main>
    </div>
  );
}
