'use client';

import React, { useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Premium modal system with spring animations, glassmorphism, and
// sheet-style drawers. Replaces the basic Dialog primitives.

interface PremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'dialog' | 'sheet' | 'drawer';
  side?: 'right' | 'left' | 'bottom';
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  onCloseComplete?: () => void;
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
};

const SHEET_SIZES = {
  right: 'w-full max-w-md sm:max-w-lg lg:max-w-xl',
  left: 'w-full max-w-md sm:max-w-lg lg:max-w-xl',
  bottom: 'w-full max-h-[85vh]',
};

export function PremiumModal({
  open,
  onOpenChange,
  children,
  title,
  description,
  size = 'md',
  variant = 'dialog',
  side = 'right',
  showClose = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  onCloseComplete,
}: PremiumModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (closeOnEscape && e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeOnEscape]);

  const contentVariants = {
    dialog: {
      initial: { opacity: 0, scale: 0.96, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.96, y: -10 },
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    },
    sheet: {
      initial: { opacity: 0, x: side === 'right' ? 300 : side === 'left' ? -300 : 0, y: side === 'bottom' ? 300 : 0 },
      animate: { opacity: 1, x: 0, y: 0 },
      exit: { opacity: 0, x: side === 'right' ? 300 : side === 'left' ? -300 : 0, y: side === 'bottom' ? 300 : 0 },
      transition: { type: 'spring', stiffness: 400, damping: 35 },
    },
    drawer: {
      initial: { opacity: 0, x: side === 'right' ? 400 : side === 'left' ? -400 : 0 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: side === 'right' ? 400 : side === 'left' ? -400 : 0 },
      transition: { type: 'spring', stiffness: 400, damping: 35 },
    },
  };

  const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  };

  if (!mountedRef.current && !open) return null;

  const v = contentVariants[variant];

  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
          <DialogPrimitive.Portal>
            <motion.div
              ref={overlayRef}
              className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
              initial={overlayVariants.initial}
              animate={overlayVariants.animate}
              exit={overlayVariants.exit}
              onClick={handleOverlayClick}
              aria-hidden="true"
            />
            <motion.div
              ref={contentRef}
              className={cn(
                'fixed z-50 flex flex-col',
                variant === 'dialog' && 'left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-full',
                variant === 'sheet' && side === 'right' && 'right-0 top-0 h-full',
                variant === 'sheet' && side === 'left' && 'left-0 top-0 h-full',
                variant === 'sheet' && side === 'bottom' && 'left-0 bottom-0 w-full',
                variant === 'drawer' && side === 'right' && 'right-0 top-0 h-full w-full max-w-md sm:max-w-lg lg:max-w-xl',
                variant === 'drawer' && side === 'left' && 'left-0 top-0 h-full w-full max-w-md sm:max-w-lg lg:max-w-xl',
                SIZES[size],
                variant !== 'dialog' && SHEET_SIZES[side],
                className
              )}
              initial={v.initial}
              animate={v.animate}
              exit={v.exit}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
              aria-describedby={description ? 'modal-description' : undefined}
            >
              <div className="flex flex-col h-full">
                {/* Glassmorphism Header */}
                {(title || description || showClose) && (
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200/60 bg-white/95 backdrop-blur-md px-6 py-4 sticky top-0 z-10">
                    <div className="flex-1 min-w-0">
                      {title && (
                        <h2 id="modal-title" className="text-lg font-bold tracking-tight text-slate-900">
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p id="modal-description" className="mt-1 text-sm text-slate-500">
                          {description}
                        </p>
                      )}
                    </div>
                    {showClose && (
                      <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        aria-label="Close modal"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                  {children}
                </div>
              </div>
            </motion.div>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </AnimatePresence>
  );
}

// Convenience hooks
export function usePremiumModal() {
  const [state, setState] = React.useState<{
    open: boolean;
    config: Omit<PremiumModalProps, 'open' | 'onOpenChange' | 'children'>;
    content: React.ReactNode;
  }>({
    open: false,
    config: {},
    content: null,
  });

  const open = React.useCallback(
    (content: React.ReactNode, config: Omit<PremiumModalProps, 'open' | 'onOpenChange' | 'children'> = {}) => {
      setState({ open: true, config, content });
    },
    []
  );

  const close = React.useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return { ...state, open, close };
}

// Form modal with built-in submit handling
interface PremiumFormModalProps extends Omit<PremiumModalProps, 'children'> {
  onSubmit: (data: FormData) => Promise<void> | void;
  submitLabel?: string;
  submitVariant?: 'default' | 'emerald' | 'rose' | 'amber' | 'sky' | 'violet' | 'indigo';
  isSubmitting?: boolean;
  children: (register: (name: string) => React.InputHTMLAttributes<HTMLInputElement>) => React.ReactNode;
}

export function PremiumFormModal({
  onSubmit,
  submitLabel = 'Save',
  submitVariant = 'default',
  isSubmitting = false,
  ...props
}: PremiumFormModalProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    await onSubmit(formData);
  };

  return (
    <PremiumModal {...props}>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        {typeof props.children === 'function'
          ? (props.children as any)((name: string) => ({ name, id: name }))
          : props.children}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/60">
          <button
            type="button"
            onClick={() => props.onOpenChange(false)}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`h-10 px-5 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed ${
              submitVariant === 'emerald'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : submitVariant === 'rose'
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : submitVariant === 'amber'
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : submitVariant === 'sky'
                ? 'bg-sky-600 text-white hover:bg-sky-700'
                : submitVariant === 'violet'
                ? 'bg-violet-600 text-white hover:bg-violet-700'
                : submitVariant === 'indigo'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </PremiumModal>
  );
}