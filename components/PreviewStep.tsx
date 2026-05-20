'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IDCardPreview } from './id-card-preview';
import { IDCardBackPreview } from './id-card-back-preview';
import { ArrowLeft, Download, RotateCw } from 'lucide-react';
import type { IDCardData } from '@/types/id-card';
import { CardScaleWrapper } from './CardScaleWrapper';

interface Props {
  data: IDCardData;
  qrValue?: string;
  onBack: () => void;
  onDownload: () => void;
  cardRef: React.RefObject<HTMLDivElement>;
  backCardRef: React.RefObject<HTMLDivElement>;
}

export function PreviewStep({ data, qrValue, onBack, onDownload, cardRef, backCardRef }: Props) {
  const [viewLayout, setViewLayout] = useState<'flip' | 'both'>('flip');
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div>
      {/* Dynamic View Layout Switcher */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => setViewLayout('flip')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewLayout === 'flip'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
              Card View
            </span>
          </button>
          <button
            onClick={() => setViewLayout('both')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewLayout === 'both'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
              </svg>
              Both Sides
            </span>
          </button>
        </div>
      </div>

      {viewLayout === 'flip' ? (
        <div className="flex flex-col items-center">
          <CardScaleWrapper>
            <div
              className="cursor-pointer select-none"
              onClick={() => setIsFlipped(!isFlipped)}
              style={{
                perspective: '1500px',
                width: 850,
                height: 540,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Front Side */}
                <div
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  <IDCardPreview data={data} cardRef={cardRef} />
                </div>
                
                {/* Back Side */}
                <div
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  <IDCardBackPreview data={data} qrValue={qrValue} backCardRef={backCardRef} />
                </div>
              </div>
            </div>
          </CardScaleWrapper>
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5 animate-pulse">
            <RotateCw className="w-3.5 h-3.5" /> Click card to flip 3D view
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider text-center">Front</p>
            <CardScaleWrapper>
              <div style={{ userSelect: 'none', pointerEvents: 'none' }}>
                <IDCardPreview data={data} cardRef={cardRef} />
              </div>
            </CardScaleWrapper>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider text-center">Back</p>
            <CardScaleWrapper>
              <div style={{ userSelect: 'none', pointerEvents: 'none' }}>
                <IDCardBackPreview data={data} qrValue={qrValue} backCardRef={backCardRef} />
              </div>
            </CardScaleWrapper>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3 mt-8">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Edit
        </Button>
        <Button onClick={onDownload} className="gap-2">
          <Download className="w-4 h-4" /> Finalize & Download
        </Button>
      </div>
    </div>
  );
}
