'use client';

import React, { useEffect, useRef, useState } from 'react';
import { formatINRFromPaise } from '../engine/financialEngine';
import { useV2Store } from '../store/useV2Store';

interface AnimatedCurrencyProps {
  paise: number;
  className?: string;
  showSign?: boolean;
  showDecimals?: boolean;
}

export function AnimatedCurrency({
  paise,
  className = '',
  showSign = false,
  showDecimals = false,
}: AnimatedCurrencyProps) {
  const privacyMasked = useV2Store((s) => s.privacyMasked);
  const [displayPaise, setDisplayPaise] = useState(paise);
  const currentRef = useRef(paise);

  useEffect(() => {
    const start = currentRef.current;
    const end = paise;
    if (start === end) {
      setDisplayPaise(end);
      return;
    }

    const duration = 180;
    const startTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextVal = Math.round(start + (end - start) * eased);
      currentRef.current = nextVal;
      setDisplayPaise(nextVal);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        currentRef.current = end;
        setDisplayPaise(end);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [paise]);

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {formatINRFromPaise(displayPaise, {
        showSign,
        showDecimals,
        masked: privacyMasked,
      })}
    </span>
  );
}
