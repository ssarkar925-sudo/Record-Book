'use client';

import React from 'react';
import { formatINRFromPaise } from '@/v2/engine/financialEngine';

interface TabularNumsProps {
  value: number;
  masked?: boolean;
  showDecimals?: boolean;
  showSign?: boolean;
  className?: string;
}

export function TabularNums({ value, masked = false, showDecimals = false, showSign = false, className = '' }: TabularNumsProps) {
  if (masked) {
    return <span className={`font-mono tabular-nums ${className}`}>₹ ••••••</span>;
  }

  const rupees = value / 100;
  const abs = Math.abs(rupees);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(abs);

  const sign = rupees < 0 ? '-' : showSign && rupees > 0 ? '+' : '';

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {sign}₹{formatted}
    </span>
  );
}