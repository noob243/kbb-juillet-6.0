
import React, { FC } from 'react';
import { DownloadIcon } from './Icons';

interface PageContainerProps {
  title: string;
  children: React.ReactNode;
  buttonLabel?: string;
  onButtonClick?: () => void;
  exportButtonLabel?: string;
  onExportClick?: () => void;
  extraHeaderActions?: React.ReactNode;
}

const PageContainer: FC<PageContainerProps> = ({ title, children, buttonLabel, onButtonClick, exportButtonLabel, onExportClick, extraHeaderActions }) => (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{title}</h1>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                {extraHeaderActions}
                {exportButtonLabel && onExportClick && (
                    <button onClick={onExportClick} className="bg-slate-700 text-white font-bold py-2 px-3.5 sm:px-4 text-xs sm:text-sm rounded-xl hover:bg-slate-800 transition duration-300 shadow-xs flex items-center shrink-0 cursor-pointer">
                        <DownloadIcon />
                        <span className="ml-2">{exportButtonLabel}</span>
                    </button>
                )}
                {buttonLabel && onButtonClick && (
                    <button onClick={onButtonClick} className="bg-indigo-600 text-white font-bold py-2 px-3.5 sm:px-4 text-xs sm:text-sm rounded-xl hover:bg-indigo-700 transition duration-300 shadow-xs flex items-center shrink-0 cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        {buttonLabel}
                    </button>
                )}
            </div>
        </div>
        <div className="bg-white dark:bg-[#0c111d] p-3.5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 transition-colors">
            {children}
        </div>
    </div>
);

export default PageContainer;
