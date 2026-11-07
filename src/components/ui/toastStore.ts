'use client';

import { create } from 'zustand';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => string;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration ?? 3500,
    };

    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast], // Keep max 5 visible
    }));

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, newToast.duration);
    }

    return id;
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearAll: () => set({ toasts: [] }),
}));

// Quick convenience helpers
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().showToast({ type: 'success', title, description }),
  info: (title: string, description?: string) =>
    useToastStore.getState().showToast({ type: 'info', title, description }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().showToast({ type: 'warning', title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().showToast({ type: 'error', title, description }),
};
