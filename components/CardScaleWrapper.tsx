// 'use client';

// import { useEffect, useRef, useState } from 'react';

// interface Props {
//   children: React.ReactNode;
// }

// export function CardScaleWrapper({ children }: Props) {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const [scale, setScale] = useState(1);

//   useEffect(() => {
//     const handleResize = () => {
//       if (containerRef.current) {
//         // Measure parent width or fallback to viewport width
//         const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
//         const targetWidth = 850;
        
//         // If container width is less than card width (850px), scale down
//         if (parentWidth < targetWidth + 32) { // 32px padding safety margin
//           setScale((parentWidth - 32) / targetWidth);
//         } else {
//           setScale(1);
//         }
//       }
//     };

//     handleResize();
//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   return (
//     <div
//       ref={containerRef}
//       className="w-full flex justify-center items-center overflow-hidden"
//       style={{
//         height: 540 * scale,
//         transition: 'height 0.15s ease-out',
//       }}
//     >
//       <div
//         style={{
//           width: 850,
//           height: 540,
//           transform: `scale(${scale})`,
//           transformOrigin: 'center center',
//           flexShrink: 0,
//           transition: 'transform 0.15s ease-out',
//         }}
//       >
//         {children}
//       </div>
//     </div>
//   );
// }


// // ================================
// // CardScaleWrapper.tsx
// // ================================

// // 'use client';

// // import { useEffect, useRef, useState } from 'react';

// // interface Props {
// //   children: React.ReactNode;
// // }

// // export function CardScaleWrapper({ children }: Props) {
// //   const containerRef = useRef<HTMLDivElement>(null);
// //   const [scale, setScale] = useState(1);

// //   useEffect(() => {
// //     const handleResize = () => {
// //       if (!containerRef.current) return;

// //       const parentWidth =
// //         containerRef.current.parentElement?.clientWidth || window.innerWidth;

// //       const targetWidth = 850;

// //       if (parentWidth < targetWidth + 32) {
// //         setScale((parentWidth - 32) / targetWidth);
// //       } else {
// //         setScale(1);
// //       }
// //     };

// //     handleResize();

// //     window.addEventListener('resize', handleResize);

// //     return () => {
// //       window.removeEventListener('resize', handleResize);
// //     };
// //   }, []);

// //   return (
// //     <div
// //       ref={containerRef}
// //       className="w-full flex justify-center overflow-hidden"
// //       style={{
// //         height: 540 * scale,
// //       }}
// //     >
// //       <div
// //         style={{
// //           width: 850,
// //           height: 540,
// //           transform: `scale(${scale})`,
// //           transformOrigin: 'top center',
// //           willChange: 'transform',
// //         }}
// //       >
// //         {children}
// //       </div>
// //     </div>
// //   );
// // }


'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  isExportMode?: boolean; // When true, no scaling, fixed 850x540
}

export function CardScaleWrapper({ children, isExportMode = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Skip resize calculations in export mode
    if (isExportMode) {
      setScale(1);
      return;
    }

    const handleResize = () => {
      if (containerRef.current) {
        const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
        const targetWidth = 850;
        
        if (parentWidth < targetWidth + 32) {
          setScale((parentWidth - 32) / targetWidth);
        } else {
          setScale(1);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExportMode]);

  // Fixed dimensions in export mode - no scaling transforms
  if (isExportMode) {
    return (
      <div
        ref={containerRef}
        className="w-full flex justify-center items-center overflow-hidden"
        style={{
          width: 850,
          height: 540,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            width: 850,
            height: 540,
            flexShrink: 0,
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  // Normal responsive scaling mode
  return (
    <div
      ref={containerRef}
      className="w-full flex justify-center items-center overflow-hidden"
      style={{
        height: 540 * scale,
        transition: 'height 0.15s ease-out',
      }}
    >
      <div
        style={{
          width: 850,
          height: 540,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
          transition: 'transform 0.15s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}