'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  AlertCircle,
  X,
} from 'lucide-react';
import { useToastStore, ToastType } from './toastStore';

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />,
  info: <Info className="h-4 w-4 text-indigo-600 shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
  error: <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />,
};

const TOAST_THEMES: Record<
  ToastType,
  { border: string; bgBadge: string; shadow: string }
> = {
  success: {
    border: 'border-emerald-200/90',
    bgBadge: 'bg-emerald-50 text-emerald-800',
    shadow: 'shadow-emerald-500/5',
  },
  info: {
    border: 'border-indigo-200/90',
    bgBadge: 'bg-indigo-50 text-indigo-800',
    shadow: 'shadow-indigo-500/5',
  },
  warning: {
    border: 'border-amber-200/90',
    bgBadge: 'bg-amber-50 text-amber-800',
    shadow: 'shadow-amber-500/5',
  },
  error: {
    border: 'border-rose-200/90',
    bgBadge: 'bg-rose-50 text-rose-800',
    shadow: 'shadow-rose-500/5',
  },
};

export function DaylightToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <aside
      aria-label="Notifications"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const theme = TOAST_THEMES[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.16 } }}
              transition={{
                type: 'spring',
                stiffness: 450,
                damping: 32,
              }}
              className={`pointer-events-auto w-full rounded-xl border ${theme.border} bg-white/95 backdrop-blur-md p-3.5 shadow-lg ${theme.shadow} flex items-start gap-3 relative overflow-hidden`}
              style={{
                boxShadow:
                  '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.95)',
              }}
            >
              {/* Top micro-accent line */}
              <div
                className={`absolute top-0 left-0 right-0 h-0.5 ${
                  toast.type === 'success'
                    ? 'bg-emerald-500'
                    : toast.type === 'info'
                    ? 'bg-indigo-500'
                    : toast.type === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />

              <div
                className={`p-1 rounded-lg ${theme.bgBadge} mt-0.5 shrink-0`}
              >
                {TOAST_ICONS[toast.type]}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  {toast.title}
                </h4>
                {toast.description && (
                  <p className="mt-1 text-[11px] text-slate-600 leading-relaxed break-words">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </aside>
  );
}
