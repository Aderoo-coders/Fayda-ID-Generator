'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  background?: string;
  lineColor?: string;
  margin?: number;
  className?: string;
}

export function Barcode({
  value,
  format = 'CODE128',
  width = 2,
  height = 30,
  displayValue = false,
  background = 'transparent',
  lineColor = '#000000',
  margin = 0,
  className = '',
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        const cleanValue = value.replace(/\s+/g, '');
        JsBarcode(svgRef.current, cleanValue, {
          format,
          width,
          height,
          displayValue,
          background,
          lineColor,
          margin,
        });
      } catch (err) {
        console.error('Failed to generate barcode', err);
      }
    }
  }, [value, format, width, height, displayValue, background, lineColor, margin]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
}
