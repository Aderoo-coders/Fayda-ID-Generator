// 'use client';

// import type { IDCardData } from '@/types/id-card';
// import { Barcode } from './Barcode';
// import { formatDualDate } from '@/lib/date-utils';

// // Next.js: images are served from /public — place template PNGs in public/static/
// const templateBgSrc = encodeURI('/static/ID-front template.png');

// interface Props {
//   data: IDCardData;
//   cardRef?: React.RefObject<HTMLDivElement>;
// }

// export function IDCardPreview({ data, cardRef }: Props) {
//   const sexAm = data.sex === 'Male' ? 'ወንድ' : data.sex === 'Female' ? 'ሴት' : '';

//   return (
//     <div className="flex justify-center">
//       <div
//         ref={cardRef}
//         className="relative rounded-xl overflow-hidden shadow-2xl"
//         style={{ width: 850, height: 540, fontFamily: "'Inter', sans-serif" }}
//       >
//         {/* Background template */}
//         <img
//           src={templateBgSrc}
//           alt=""
//           className="absolute inset-0 w-full h-full object-cover"
//           style={{ pointerEvents: 'none' }}
//         />

//         {/* Left vertical text — Date of Issue (English + Amharic stacked) */}
//         <div
//           className="absolute flex flex-col items-center justify-center gap-[20px] mt-4"
//           style={{ left: 12, top: 70, height: 380 }}
//         >
//           {/* English */}
//           <p
//             className="text-[12px] text-yellow-700 font-bold whitespace-nowrap tracking-wide"
//             style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
//           >
//             Date of Issue :&ensp;
//             <span className="text-[18px] text-black font-bold">{data.date_of_issue || '——/——/————'}</span>
//           </p>

//           {/* Amharic */}
//           <p
//             className="text-[12px] text-yellow-700 font-bold font-ethiopic whitespace-nowrap"
//             style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
//           >
//             የተሰጠበት ቀን :&ensp;
//             <span className="text-[18px] text-black font-sans font-bold">{data.date_of_issue || '——/——/————'}</span>
//           </p>
//         </div>

//         {/* Main portrait photo */}
//         <div
//           className="absolute overflow-hidden"
//           style={{ top: 160, left: 54, width: 240, height: 300 }}
//         >
//           {data.photo ? (
//             <img
//               src={data.photo}
//               alt="ID Photo"
//               style={{
//                 display: 'block',
//                 width: '100%',
//                 height: '100%',
//                 objectFit: 'fill',
//                 objectPosition: 'center top',
//                 filter: 'grayscale(1) contrast(1.08) brightness(1.03)',
//               }}
//             />
//           ) : (
//             <div className="w-full h-full flex items-center justify-center text-[hsl(220,10%,50%)] text-sm">
//               Photo
//             </div>
//           )}
//         </div>

//         {/* Fields — right of photo */}
//         <div className="absolute" style={{ top: 130, left: 330, right: 30 }}>
//           {/* Full Name */}
//           <p className="text-[12px] text-yellow-700 font-bold">
//             ሙሉ ስም | <span className="font-sans">Full Name</span>
//           </p>
//           {data.name_am && (
//             <p className="text-[20px] font-bold text-black font-ethiopic leading-tight">
//               {data.name_am}
//             </p>
//           )}
//           {data.name_en && (
//             <p className="text-[20px] font-bold text-black leading-tight tracking-wide">
//               {data.name_en}
//             </p>
//           )}

//           {/* Date of Birth */}
//           <div className="mt-4">
//             <p className="text-[12px] text-yellow-700 font-bold">
//               የተውለድ ቀን | <span className="font-sans">Date of Birth</span>
//             </p>
//             <p className="text-[20px] font-bold text-black tracking-wide">
//               {formatDualDate(data.dob)}
//             </p>
//           </div>

//           {/* Sex */}
//           <div className="mt-4">
//             <p className="text-[12px] text-yellow-700 font-bold">
//               ጸታ | <span className="font-sans">Sex</span>
//             </p>
//             <p className="text-[20px] font-bold text-black font-ethiopic">
//               {sexAm && <span>{sexAm} | </span>}
//               <span className="font-sans tracking-wide">{data.sex?.toUpperCase() || '—'}</span>
//             </p>
//           </div>

//           {/* Date of Expiry */}
//           <div className="mt-3">
//             <p className="text-[12px] text-yellow-700 font-bold">
//               የሚያበቃበት ቀን | <span className="font-sans">Date of Expiry</span>
//             </p>
//             <p className="text-[20px] font-bold text-black tracking-wide">
//               {formatDualDate(data.date_of_expiry)}
//             </p>
//           </div>
//         </div>

//         {/* Bottom bar — FAN number + real barcode */}
//         <div
//           className="absolute flex items-center gap-2"
//           style={{ bottom: 30, left: 330, right: 130 }}
//         >
//           <div className="flex flex-col">
//             <p className="text-[15px] text-yellow-700 font-bold leading-tight">
//               ካርድ<br />ቁጥር<br /><span className="font-sans font-bold">FAN</span>
//             </p>
//           </div>
//           <div className="bg-white px-3 py-2 rounded-sm">
//             <p className="text-[15px] font-bold text-black font-mono tracking-[0.05em]">
//               {data.fan || '0000 0000 0000 0000'}
//             </p>
//             <div className="h-[30px] flex items-center overflow-hidden">
//               <Barcode
//                 value={data.fan || '0000000000000000'}
//                 height={26}
//                 width={1.2}
//                 lineColor="black"
//               />
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

'use client';

import type { IDCardData } from '@/types/id-card';
import { Barcode } from '../Barcode';
import { formatDualDate } from '@/lib/date-utils';

const templateBgSrc = encodeURI('/static/ID-front template.png');

interface Props {
  data: IDCardData;
  cardRef?: React.RefObject<HTMLDivElement>;
  isExportMode?: boolean; // Use object-contain for images in export mode
}

export function IDCardPreview({ data, cardRef, isExportMode = false }: Props) {
  const sexAm = data.sex === 'Male' ? 'ወንድ' : data.sex === 'Female' ? 'ሴት' : '';

  return (
    <div className="flex justify-center">
      <div
        ref={cardRef}
        className="relative rounded-xl overflow-hidden shadow-2xl"
        style={{ width: 850, height: 540, fontFamily: "'Inter', sans-serif" }}
      >
        {/* Background template - fixed dimensions in export mode */}
        <img
          src={templateBgSrc}
          alt=""
          className="absolute inset-0 w-full h-full select-none"
          style={{
            objectFit: isExportMode ? 'contain' : 'cover',
            objectPosition: 'center',
            pointerEvents: 'none',
            WebkitUserDrag: 'none',
          } as React.CSSProperties}
          draggable="false"
        />

        {/* Left vertical text — Date of Issue */}
        <div
          className="absolute flex flex-col items-center justify-center gap-[20px] mt-4"
          style={{ left: 12, top: 70, height: 380 }}
        >
          <p
            className="text-[12px] text-yellow-700 font-bold whitespace-nowrap tracking-wide"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Date of Issue :&ensp;
            <span className="text-[18px] text-black font-bold">{data.date_of_issue || '——/——/————'}</span>
          </p>

          <p
            className="text-[12px] text-yellow-700 font-bold font-ethiopic whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            የተሰጠበት ቀን :&ensp;
            <span className="text-[18px] text-black font-sans font-bold">{data.date_of_issue || '——/——/————'}</span>
          </p>
        </div>

        {/* Main portrait photo - use object-contain in export mode */}
        <div
          className="absolute overflow-hidden"
          style={{ top: 160, left: 54, width: 240, height: 300 }}
        >
          {data.photo ? (
            <img
              src={data.photo}
              alt="ID Photo"
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: isExportMode ? 'contain' : 'fill',
                objectPosition: 'center top',
                filter: 'grayscale(1) contrast(1.08) brightness(1.03)',
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[hsl(220,10%,50%)] text-sm">
              Photo
            </div>
          )}
        </div>

        {/* Fields — right of photo */}
        <div className="absolute" style={{ top: 130, left: 330, right: 30 }}>
          <p className="text-[12px] text-yellow-700 font-bold">
            ሙሉ ስም | <span className="font-sans">Full Name</span>
          </p>
          {data.name_am && (
            <p className="text-[20px] font-bold text-black font-ethiopic leading-tight">
              {data.name_am}
            </p>
          )}
          {data.name_en && (
            <p className="text-[20px] font-bold text-black leading-tight tracking-wide">
              {data.name_en}
            </p>
          )}

          <div className="mt-4">
            <p className="text-[12px] text-yellow-700 font-bold">
              የተውለድ ቀን | <span className="font-sans">Date of Birth</span>
            </p>
            <p className="text-[20px] font-bold text-black tracking-wide">
              {formatDualDate(data.dob)}
            </p>
          </div>

          <div className="mt-4">
            <p className="text-[12px] text-yellow-700 font-bold">
              ጸታ | <span className="font-sans">Sex</span>
            </p>
            <p className="text-[20px] font-bold text-black font-ethiopic">
              {sexAm && <span>{sexAm} | </span>}
              <span className="font-sans tracking-wide">{data.sex?.toUpperCase() || '—'}</span>
            </p>
          </div>

          <div className="mt-3">
            <p className="text-[12px] text-yellow-700 font-bold">
              የሚያበቃበት ቀን | <span className="font-sans">Date of Expiry</span>
            </p>
            <p className="text-[20px] font-bold text-black tracking-wide">
              {formatDualDate(data.date_of_expiry)}
            </p>
          </div>
        </div>

        {/* Bottom bar — FAN number + barcode */}
        <div
          className="absolute flex items-center gap-2"
          style={{ bottom: 30, left: 330, right: 130 }}
        >
          <div className="flex flex-col">
            <p className="text-[15px] text-yellow-700 font-bold leading-tight">
              ካርድ<br />ቁጥር<br /><span className="font-sans font-bold">FAN</span>
            </p>
          </div>
          <div className="bg-white px-3 py-2 rounded-sm">
            <p className="text-[15px] font-bold text-black font-mono tracking-[0.05em]">
              {data.fan || '0000 0000 0000 0000'}
            </p>
            <div className="h-[30px] flex items-center overflow-hidden">
              <Barcode
                value={data.fan || '0000000000000000'}
                height={26}
                width={1.2}
                lineColor="black"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}