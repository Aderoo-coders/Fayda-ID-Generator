import { useRef, useEffect, useState, type CSSProperties, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  maxFontSize?: number;
  minFontSize?: number;
  className?: string;
  style?: CSSProperties;
  /** If true, truncate with ellipsis when text can't fit even at minFontSize */
  truncate?: boolean;
}

export function AutoFitText({
  children,
  maxFontSize = 16,
  minFontSize = 8,
  className = '',
  style = {},
  truncate = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    // Reset
    setIsTruncated(false);
    let size = maxFontSize;
    text.style.fontSize = `${size}px`;

    // Shrink until it fits or hits minimum
    while (size > minFontSize && text.scrollWidth > container.clientWidth) {
      size -= 0.5;
      text.style.fontSize = `${size}px`;
    }

    // If still overflowing at min size, enable truncation
    if (text.scrollWidth > container.clientWidth) {
      setIsTruncated(true);
    }

    setFontSize(size);
  }, [children, maxFontSize, minFontSize]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        ref={textRef}
        style={{
          fontSize: `${fontSize}px`,
          display: 'inline-block',
          maxWidth: '100%',
          ...(isTruncated && truncate
            ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }
            : {}),
        }}
      >
        {children}
      </span>
    </div>
  );
}
