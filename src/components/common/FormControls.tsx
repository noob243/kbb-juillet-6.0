import React, { FC, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: ReactNode;
  className?: string;
}

export const FormField: FC<FormFieldProps> = ({
  label,
  required,
  error,
  helperText,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
        {label} {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-semibold text-rose-500 flex items-center gap-1 mt-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/60 dark:bg-slate-900/60 border rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200 outline-hidden ${
          error
            ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
            : 'border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-300 dark:hover:border-slate-600'
        } disabled:bg-slate-100 dark:disabled:bg-slate-800/80 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);
FormInput.displayName = 'FormInput';

export interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/60 dark:bg-slate-900/60 border rounded-xl text-slate-800 dark:text-slate-100 appearance-none transition-all duration-200 outline-hidden cursor-pointer ${
            error
              ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
              : 'border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-300 dark:hover:border-slate-600'
          } disabled:bg-slate-100 dark:disabled:bg-slate-800/80 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }
);
FormSelect.displayName = 'FormSelect';

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/60 dark:bg-slate-900/60 border rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200 outline-hidden ${
          error
            ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 bg-rose-50/20'
            : 'border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-300 dark:hover:border-slate-600'
        } disabled:bg-slate-100 dark:disabled:bg-slate-800/80 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);
FormTextarea.displayName = 'FormTextarea';

export interface FormSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
}

export const FormSectionHeader: FC<FormSectionHeaderProps> = ({ title, subtitle, icon, className = '' }) => (
  <div className={`border-b border-slate-100 dark:border-slate-800/80 pb-2.5 mb-4 ${className}`}>
    <div className="flex items-center gap-2">
      {icon && <span className="text-indigo-600 dark:text-indigo-400">{icon}</span>}
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">{title}</h3>
    </div>
    {subtitle && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
  </div>
);
