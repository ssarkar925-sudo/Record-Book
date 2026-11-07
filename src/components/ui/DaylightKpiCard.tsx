'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { AnimatedCurrency } from '@/v2/components/AnimatedCurrency';

export type KpiAccentColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'teal' | 'violet' | 'pink';

interface DaylightKpiCardProps {
  title: string;
  paise: number;
  icon: LucideIcon;
  accent?: KpiAccentColor;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'danger';
  ratioBar?: {
    primaryPct: number;
    primaryLabel: string;
    secondaryLabel?: string;
  };
  actionLabel?: string;
  onClick?: () => void;
  className?: string;
}

const ACCENT_STYLES: Record<
  KpiAccentColor,
  {
    iconBg: string;
    iconBorder: string;
    iconText: string;
    glowBg: string;
    topBorder: string;
    ratioColor: string;
  }
> = {
  indigo: {
    iconBg: 'bg-indigo-50/90',
    iconBorder: 'border-indigo-200/80',
    iconText: 'text-indigo-600',
    glowBg: 'from-indigo-50/40 via-transparent to-transparent',
    topBorder: 'border-t-indigo-500/70',
    ratioColor: 'bg-indigo-500',
  },
  emerald: {
    iconBg: 'bg-emerald-50/90',
    iconBorder: 'border-emerald-200/80',
    iconText: 'text-emerald-600',
    glowBg: 'from-emerald-50/40 via-transparent to-transparent',
    topBorder: 'border-t-emerald-500/70',
    ratioColor: 'bg-emerald-500',
  },
  amber: {
    iconBg: 'bg-amber-50/90',
    iconBorder: 'border-amber-200/80',
    iconText: 'text-amber-600',
    glowBg: 'from-amber-50/40 via-transparent to-transparent',
    topBorder: 'border-t-amber-500/70',
    ratioColor: 'bg-amber-500',
  },
  rose: {
    iconBg: 'bg-rose-50/90',
    iconBorder: 'border-rose-200/80',
    iconText: 'text-rose-600',
    glowBg: 'from-rose-50/40 via-transparent to-transparent',
    topBorder: 'border-t-rose-500/70',
    ratioColor: 'bg-rose-500',
  },
  sky: {
    iconBg: 'bg-sky-50/90',
    iconBorder: 'border-sky-200/80',
    iconText: 'text-sky-600',
    glowBg: 'from-sky-50/40 via-transparent to-transparent',
    topBorder: 'border-t-sky-500/70',
    ratioColor: 'bg-sky-500',
  },
  teal: {
    iconBg: 'bg-teal-50/90',
    iconBorder: 'border-teal-200/80',
    iconText: 'text-teal-600',
    glowBg: 'from-teal-50/40 via-transparent to-transparent',
    topBorder: 'border-t-teal-500/70',
    ratioColor: 'bg-teal-500',
  },
  violet: {
    iconBg: 'bg-violet-50/90',
    iconBorder: 'border-violet-200/80',
    iconText: 'text-violet-600',
    glowBg: 'from-violet-50/40 via-transparent to-transparent',
    topBorder: 'border-t-violet-500/70',
    ratioColor: 'bg-violet-500',
  },
  pink: {
    iconBg: 'bg-pink-50/90',
    iconBorder: 'border-pink-200/80',
    iconText: 'text-pink-600',
    glowBg: 'from-pink-50/40 via-transparent to-transparent',
    topBorder: 'border-t-pink-500/70',
    ratioColor: 'bg-pink-500',
  },
};

export function DaylightKpiCard({
  title,
  paise,
  icon: Icon,
  accent = 'indigo',
  subtitle,
  badgeText,
  badgeVariant = 'neutral',
  ratioBar,
  actionLabel,
  onClick,
  className = '',
}: DaylightKpiCardProps) {
  const styles = ACCENT_STYLES[accent];
  const isClickable = Boolean(onClick);

  const CardWrapper = isClickable ? motion.button : motion.div;

  return (
    <CardWrapper
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={isClickable ? { scale: 0.99 } : undefined}
      className={`glass-card glass-card-hover group relative flex flex-col justify-between overflow-hidden p-5 text-left border-t-2 ${styles.topBorder} ${className}`}
    >
      {/* Subtle ambient daylight light refraction */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${styles.glowBg}`}
      />

      <div className="relative z-10">
        {/* Header Row: Label + Icon + Badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <div className="flex items-center gap-1.5">
            {badgeText && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                  badgeVariant === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                    : badgeVariant === 'warning'
                      ? 'border border-amber-200 bg-amber-50 text-amber-800'
                      : badgeVariant === 'danger'
                        ? 'border border-rose-200 bg-rose-50 text-rose-800'
                        : 'border border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {badgeText}
              </span>
            )}
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl border ${styles.iconBorder} ${styles.iconBg} ${styles.iconText} shadow-2xs transition-transform group-hover:scale-105`}
            >
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Currency Metric Row */}
        <div className="my-3">
          <AnimatedCurrency
            paise={paise}
            className="font-mono text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
          />
        </div>

        {/* Optional Visual Ratio Bar */}
        {ratioBar && (
          <div className="mb-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
              <span>{ratioBar.primaryLabel}</span>
              {ratioBar.secondaryLabel && (
                <span>{ratioBar.secondaryLabel}</span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`${styles.ratioColor} h-full rounded-full transition-all duration-500`}
                style={{
                  width: `${Math.min(100, Math.max(0, ratioBar.primaryPct))}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Row: Subtitle + Action Hint */}
      <div className="relative z-10 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] font-medium text-slate-500">
        <span className="truncate">{subtitle || 'Active workspace balance'}</span>
        {actionLabel && (
          <span className="flex shrink-0 items-center gap-1 font-bold text-indigo-700 transition-colors group-hover:text-indigo-800">
            {actionLabel}
          </span>
        )}
      </div>
    </CardWrapper>
  );
}
