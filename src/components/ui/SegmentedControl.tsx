'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId = 'segmented-control-active',
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const isSm = size === 'sm';

  return (
    <div
      className={`relative inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 shadow-inner ${className}`}
    >
      {options.map((option) => {
        const isActive = value === option.id;
        const Icon = option.icon;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors duration-150 ${
              isSm ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs'
            } ${
              isActive
                ? 'text-indigo-950 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 z-[-1] rounded-lg border border-slate-200/70 bg-white shadow-xs"
              />
            )}
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
            <span>{option.label}</span>
            {typeof option.count === 'number' && (
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
