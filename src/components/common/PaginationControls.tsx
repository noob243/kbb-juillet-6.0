import React, { FC } from 'react';

interface PaginationControlsProps {
    currentPage: number;
    pageCount: number;
    startIndex: number;
    totalItems: number;
    itemLabel: string;
    onPageChange: (page: number) => void;
}

const PaginationControls: FC<PaginationControlsProps> = ({
    currentPage,
    pageCount,
    startIndex,
    totalItems,
    itemLabel,
    onPageChange
}) => {
    if (pageCount <= 1) return null;

    return (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
                Affichage de <strong className="text-slate-800 dark:text-slate-200">{startIndex + 1}–{Math.min(startIndex + 10, totalItems)}</strong> sur{' '}
                <strong className="text-slate-800 dark:text-slate-200">{totalItems}</strong> {itemLabel}
            </span>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-100 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Précédent
                </button>
                <span className="px-2 font-bold text-slate-600 dark:text-slate-300">
                    Page {currentPage} / {pageCount}
                </span>
                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
                    disabled={currentPage === pageCount}
                    className="px-3.5 py-2 bg-[#15447c] hover:bg-[#1d5b9f] text-white font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Suivante
                </button>
            </div>
        </div>
    );
};

export default PaginationControls;
