'use client';

import { useEffect, useState } from 'react';
import type { IDCardData } from '@/types/id-card';
import { AutoFitText } from '@/components/AutoFitText';
import { renderQrOnIdTemplate } from '@/lib/qr-render-template';

// Next.js: served from /public/static/
const templateBgSrc = '/static/ID-back template.png';

interface Props {
  data: IDCardData;
  /** Decoded QR raw value to re-encode into the back template's white QR panel */
  qrValue?: string;
  backCardRef?: React.RefObject<HTMLDivElement>;
}

export function IDCardBackPreview({ data, qrValue, backCardRef }: Props) {
  const [composedBg, setComposedBg] = useState<string>(templateBgSrc);

  useEffect(() => {
    let cancelled = false;
    const value = qrValue?.trim();
    if (!value) {
      setComposedBg(templateBgSrc);
      return () => { cancelled = true; };
    }
    renderQrOnIdTemplate(value)
      .then((url) => { if (!cancelled) setComposedBg(url); })
      .catch((e) => {
        console.warn('QR render on template failed, showing raw crop fallback:', e);
        // Fallback: show template without QR
        if (!cancelled) setComposedBg(templateBgSrc);
      });
    return () => { cancelled = true; };
  }, [qrValue]);

  return (
    <div className="flex justify-center">
      <div
        ref={backCardRef}
        className="relative rounded-xl overflow-hidden shadow-2xl"
        style={{
          width: 850,
          height: 540,
          fontFamily: "'Inter', sans-serif",
          flexShrink: 0,
        }}
      >
        {/* Composed background: template + QR baked in */}
        <img
          src={composedBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover select-none"
          style={{ pointerEvents: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
          draggable="false"
        />

        {/* Phone Number — top left */}
        <div className="absolute" style={{ top: 50, left: 35, right: 440 }}>
          <p className="text-[12px] font-bold text-yellow-700 font-ethiopic">
            ስልክ | <span className="font-sans">Phone Number</span>
          </p>
          <AutoFitText maxFontSize={20} minFontSize={15} className="font-bold text-black tracking-wide mt-1">
            {data.phone || '—'}
          </AutoFitText>
        </div>

        {/* Nationality — below phone */}
        <div className="absolute mt-5" style={{ top: 95, left: 35, right: 440 }}>
          <p className="text-[12px] font-bold text-yellow-700 font-ethiopic">
            ዜግነት | <span className="font-sans">Nationality</span>
          </p>
          <AutoFitText maxFontSize={20} minFontSize={15} className="font-bold text-black font-ethiopic mt-1">
            {data.nationality ? (
              <>ኢትዮጵያዊ | <span className="font-sans">{data.nationality}</span></>
            ) : '—'}
          </AutoFitText>
        </div>

        {/* Address label + fields */}
        <div className="absolute" style={{ top: 180, left: 35, width: 380 }}>
          <p className="text-[12px] font-bold text-yellow-700 font-ethiopic">
            አድራሻ | <span className="font-sans">Address</span>
          </p>
          {data.address_am && (
            <AutoFitText maxFontSize={20} minFontSize={15} className="font-bold text-black font-ethiopic mt-2">
              {data.address_am}
            </AutoFitText>
          )}
          <div className="mt-2 space-y-2">
            {data.region && (
              <AutoFitText maxFontSize={20} minFontSize={15} className="text-black">
                <span className="font-semibold">{data.region}</span>
              </AutoFitText>
            )}
            {data.zone && (
              <AutoFitText maxFontSize={20} minFontSize={15} className="text-black">
                <span className="font-semibold">{data.zone}</span>
              </AutoFitText>
            )}
            {data.woreda && (
              <AutoFitText maxFontSize={20} minFontSize={15} className="text-black">
                <span className="font-semibold">{data.woreda}</span>
              </AutoFitText>
            )}
            {data.kebele && (
              <AutoFitText maxFontSize={13} minFontSize={9} className="text-black">
                <span className="font-semibold">{data.kebele}</span>
              </AutoFitText>
            )}
          </div>
        </div>

        {/* FIN — bottom left, white background wrapping content */}
        <div
          className="absolute flex items-center justify-start gap-[6px] bg-white px-3 py-1 rounded-sm"
          style={{ bottom: 65, left: 35}}
        >
          <p className="text-[10px] text-center text-black font-ethiopic leading-tight">
            <span className="font-semibold">ፋይዲ</span><br />
            <span className="font-semibold">ልደ ቁጥር</span>
          </p>
          <div className="flex items-center gap-3 mt-0.5 flex-1 min-w-0">
            <span className="font-mono text-black">|FIN</span>
            <AutoFitText maxFontSize={16} minFontSize={10} className="font-bold text-black font-mono tracking-wider flex-1">
              {data.fin || '—'}
            </AutoFitText>
          </div>
        </div>

        {/* SN — bottom right, white background */}
        <div className="absolute bg-white py-1 px-3" style={{ bottom: 20, right: 35 }}>
          <p className="text-[12px] whitespace-nowrap">
            <span className="font-bold text-yellow-700">SN :</span>{' '}
            <span className="font-bold text-[18px] text-black tracking-wide">{data.sn || '—'}</span>
          </p>
        </div>

        {/* Bottom notice text — frosted glass effect */}
        <div
          className="absolute mb-3 backdrop-blur-xs bg-white/30 px-1 py-1 rounded-sm"
          style={{ bottom: 10, left: 35, right: 120 }}
        >
          <p className="text-[10px] text-black leading-tight font-medium">
            ይህ መታወቂያ ጠፍቶ ካገኙ በአቅራቢያም ላለ ፖሊስ ጣቢያ ወይም ለተቋሙ ያስረክቡ:: ለተጨማሪ 9779 ላይ ደውሉ ወይም id.et/cardprint ይጎብኙ::
          </p>
          <p className="text-[10px] text-black font-semibold leading-tight mt-0.5">
            If lost and found, please return to nearby police station or to the institution. Call 9779 or visit id.et/cardprint for more.
          </p>
        </div>
      </div>
    </div>
  );
}
