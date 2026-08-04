import React, { FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const ConfirmDeleteModal: FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmation de suppression",
  message,
  itemName,
  confirmLabel = "Confirmer la suppression",
  cancelLabel = "Annuler"
}) => {
  if (!isOpen) return null;

  const defaultMessage = itemName 
    ? `Voulez-vous vraiment supprimer définitivement "${itemName}" ? Cette action est irréversible.`
    : `Voulez-vous vraiment exécuter cette suppression ? Cette action est irréversible.`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-rose-900/40 shadow-2xl relative w-full max-w-md overflow-hidden z-10 p-6 flex flex-col pointer-events-auto"
        >
          <div className="flex items-start space-x-4 mb-4">
            <span className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 shadow-xs animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1.5 leading-relaxed">
                {message || defaultMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 mt-4 bg-slate-50 dark:bg-slate-950/50 -mx-6 -mb-6 p-4 border-t border-slate-150 dark:border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-black text-slate-600 dark:text-slate-300 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700 active:scale-95 cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-5 py-2.5 text-xs font-black text-white rounded-xl bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/15 active:scale-95 transition cursor-pointer"
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmDeleteModal;
