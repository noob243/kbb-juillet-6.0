import React, { FC } from 'react';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({ 
  message = "Chargement de KBB App...", 
  fullScreen = true 
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
      <div className="relative mb-5 flex items-center justify-center">
        {/* Soft glowing halo ring animation */}
        <div className="absolute w-28 h-28 rounded-full bg-indigo-500/10 dark:bg-indigo-400/15 animate-ping" />
        
        {/* Outer rotating pulse ring */}
        <div className="absolute w-24 h-24 rounded-full border-2 border-indigo-500/20 dark:border-indigo-400/20 border-t-[#15447c] dark:border-t-indigo-400 animate-spin" />
        
        {/* Central Logo Container with smooth scale pulse */}
        <div className="relative w-20 h-20 bg-white dark:bg-[#0c111d] rounded-2xl p-2.5 shadow-xl border border-gray-100 dark:border-slate-800 flex items-center justify-center animate-pulse">
          <img 
            src="https://lh3.googleusercontent.com/d/1GW4qFRE3YAgUUEuOn3IVPV3_QQ46wsGg" 
            alt="KBB App Chargement" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
        {message}
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold">
        Synchronisation sécurisée KBB App
      </p>

      {/* Modern progress pulse line */}
      <div className="w-36 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-4 overflow-hidden relative">
        <div className="absolute top-0 bottom-0 left-0 bg-[#15447c] dark:bg-indigo-500 w-1/2 rounded-full animate-subtlePulse" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50/90 dark:bg-[#070b13]/90 backdrop-blur-md flex items-center justify-center transition-opacity duration-300">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
