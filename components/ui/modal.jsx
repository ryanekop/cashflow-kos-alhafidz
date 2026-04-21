"use client";

import { AnimatePresence, motion } from "framer-motion";

export default function Modal({ open, title, description, onClose, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="modal-box"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
          >
            {title ? <h3 className="mb-2 text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3> : null}
            {description ? <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{description}</p> : null}
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
