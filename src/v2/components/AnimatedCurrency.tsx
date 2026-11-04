'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { formatINRFromPaise } from '@/v2/engine/financialEngine';
import { cn } from '@/lib/utils';

interface AnimatedCurrencyProps {
  valuePaise: number;
  className?: string;
  showSign?: boolean;
}

export function AnimatedCurrency({
  valuePaise,
  className,
  showSign = false,
}: AnimatedCurrencyProps) {
  const [displayPaise, setDisplayPaise] = useState(valuePaise);
  const proxyRef = useRef({ val: valuePaise });

  useEffect(() => {
    const tween = gsap.to(proxyRef.current, {
      val: valuePaise,
      duration: 0.55,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayPaise(Math.round(proxyRef.current.val));
      },
    });

    return () => {
      tween.kill();
    };
  }, [valuePaise]);

  return (
    <span className={cn('tabular-nums font-mono tracking-tight', className)}>
      {formatINRFromPaise(displayPaise, { showSign })}
    </span>
  );
}
