"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ToastContext = createContext(null);

const toastStyles = {
  success: "border-green-200 bg-green-50 text-green-700 dark:border-green-700/50 dark:bg-green-900/30 dark:text-green-300",
  error: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/50 dark:bg-red-900/30 dark:text-red-300",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-300",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/50 dark:bg-blue-900/30 dark:text-blue-300",
};

const toastIcons = {
  success: "✓",
  error: "!",
  warning: "!",
  info: "i",
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast harus dipakai di dalam ToastProvider.");
  }
  return context;
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, variant = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, variant }]);
    timers.current.set(id, setTimeout(() => dismiss(id), duration));
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-16 z-[120] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 lg:top-6">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3 text-sm shadow-lg ${toastStyles[toast.variant] ?? toastStyles.info}`}
              initial={{ opacity: 0, x: 80, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              role="status"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                {toastIcons[toast.variant] ?? toastIcons.info}
              </span>
              <span className="flex-1 leading-5">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-lg leading-5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Tutup notifikasi"
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
