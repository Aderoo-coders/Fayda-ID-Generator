// import { useState } from 'react';
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
// import { Button } from '@/components/ui/button';
// import { FileImage, FileText, Loader2, CheckCircle2 } from 'lucide-react';

// interface Props {
//   cardRef: React.RefObject<HTMLDivElement>;
//   backCardRef: React.RefObject<HTMLDivElement>;
// }

// export function DownloadStep({ cardRef, backCardRef }: Props) {
//   const [downloading, setDownloading] = useState(false);

//   const captureCard = (ref: React.RefObject<HTMLDivElement>) =>
//     ref.current ? html2canvas(ref.current, { scale: 3, useCORS: true, backgroundColor: null }) : null;

//   const exportPNG = async () => {
//     setDownloading(true);
//     try {
//       const frontCanvas = await captureCard(cardRef);
//       if (frontCanvas) {
//         const link = document.createElement('a');
//         link.download = 'ethiopian-id-front.png';
//         link.href = frontCanvas.toDataURL('image/png');
//         link.click();
//       }
//       const backCanvas = await captureCard(backCardRef);
//       if (backCanvas) {
//         const link = document.createElement('a');
//         link.download = 'ethiopian-id-back.png';
//         link.href = backCanvas.toDataURL('image/png');
//         link.click();
//       }
//     } finally {
//       setDownloading(false);
//     }
//   };

//   const exportPDF = async () => {
//     setDownloading(true);
//     try {
//       const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 54] });
//       const frontCanvas = await captureCard(cardRef);
//       if (frontCanvas) {
//         pdf.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 54);
//       }
//       const backCanvas = await captureCard(backCardRef);
//       if (backCanvas) {
//         pdf.addPage([85.6, 54], 'landscape');
//         pdf.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 54);
//       }
//       pdf.save('ethiopian-id-card.pdf');
//     } finally {
//       setDownloading(false);
//     }
//   };

//   return (
//     <div className="max-w-md mx-auto text-center py-8">
//       <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" />
//       <h3 className="text-xl font-bold">Your ID Card is Ready!</h3>
//       <p className="text-sm text-muted-foreground mt-1 mb-8">Choose your download format (front & back)</p>

//       <div className="flex flex-col sm:flex-row gap-3 justify-center">
//         <Button size="lg" onClick={exportPNG} disabled={downloading} className="gap-2">
//           {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />}
//           Download PNG
//         </Button>
//         <Button size="lg" variant="outline" onClick={exportPDF} disabled={downloading} className="gap-2">
//           {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
//           Download PDF
//         </Button>
//       </div>
//     </div>
//   );
// }

// ================================
// DownloadStep.tsx
// ================================

'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { Button } from '@/components/ui/button';
import {
  FileImage,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  cardRef: React.RefObject<HTMLDivElement>;
  backCardRef: React.RefObject<HTMLDivElement>;
}

export function DownloadStep({
  cardRef,
  backCardRef,
}: Props) {
  const [downloading, setDownloading] = useState(false);

  const captureCard = async (
    ref: React.RefObject<HTMLDivElement>
  ) => {
    if (!ref.current) return null;

    await document.fonts.ready;

    return html2canvas(ref.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
  };

  const exportPNG = async () => {
    setDownloading(true);

    try {
      const frontCanvas = await captureCard(cardRef);

      if (frontCanvas) {
        const link = document.createElement('a');

        link.download = 'ethiopian-id-front.png';
        link.href = frontCanvas.toDataURL('image/png');

        link.click();
      }

      const backCanvas = await captureCard(backCardRef);

      if (backCanvas) {
        const link = document.createElement('a');

        link.download = 'ethiopian-id-back.png';
        link.href = backCanvas.toDataURL('image/png');

        link.click();
      }
    } finally {
      setDownloading(false);
    }
  };

  const exportPDF = async () => {
    setDownloading(true);

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 54],
      });

      const frontCanvas = await captureCard(cardRef);

      if (frontCanvas) {
        pdf.addImage(
          frontCanvas.toDataURL('image/png'),
          'PNG',
          0,
          0,
          85.6,
          54
        );
      }

      const backCanvas = await captureCard(backCardRef);

      if (backCanvas) {
        pdf.addPage([85.6, 54], 'landscape');

        pdf.addImage(
          backCanvas.toDataURL('image/png'),
          'PNG',
          0,
          0,
          85.6,
          54
        );
      }

      pdf.save('ethiopian-id-card.pdf');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto text-center py-8">
      <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" />

      <h3 className="text-xl font-bold">
        Your ID Card is Ready!
      </h3>

      <p className="text-sm text-muted-foreground mt-1 mb-8">
        Choose your download format
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          size="lg"
          onClick={exportPNG}
          disabled={downloading}
          className="gap-2"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileImage className="w-4 h-4" />
          )}

          Download PNG
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={exportPDF}
          disabled={downloading}
          className="gap-2"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}

          Download PDF
        </Button>
      </div>
    </div>
  );
}