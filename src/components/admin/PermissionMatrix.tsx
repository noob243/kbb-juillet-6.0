import React, { FC } from 'react';
import { ModuleKey } from '../../types/rbac';
import { ALL_MODULE_PERMISSIONS } from '../../services/rbacService';

interface PermissionMatrixProps {
  selectedPermissions: ModuleKey[];
  onChange: (updatedPermissions: ModuleKey[]) => void;
  disabled?: boolean;
}

export const PermissionMatrix: FC<PermissionMatrixProps> = ({ selectedPermissions, onChange, disabled = false }) => {
  const categories = ['Général', 'Opérationnel', 'Relations', 'Administration'] as const;

  const handleToggle = (key: ModuleKey) => {
    if (disabled) return;
    if (selectedPermissions.includes(key)) {
      onChange(selectedPermissions.filter(k => k !== key));
    } else {
      onChange([...selectedPermissions, key]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange(ALL_MODULE_PERMISSIONS.map(m => m.key));
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="space-y-6 bg-slate-50/60 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#15447c] dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Matrice des Droits d'Accès et Fonctionnalités
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Cochez les modules autorisés pour ce profil dans la navigation.
          </p>
        </div>

        {!disabled && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-100 dark:border-indigo-900"
            >
              Tout cocher
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:underline px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Tout décocher
            </button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {categories.map(cat => {
          const modules = ALL_MODULE_PERMISSIONS.filter(m => m.category === cat);
          if (modules.length === 0) return null;

          return (
            <div key={cat} className="space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                {cat} ({modules.filter(m => selectedPermissions.includes(m.key)).length}/{modules.length})
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {modules.map(mod => {
                  const isChecked = selectedPermissions.includes(mod.key);
                  const isAdminOnly = mod.category === 'Administration';

                  return (
                    <div
                      key={mod.key}
                      onClick={() => handleToggle(mod.key)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-white dark:bg-slate-800/90 border-indigo-500/50 dark:border-indigo-500/60 shadow-xs ring-1 ring-indigo-500/20'
                          : 'bg-white/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100'
                      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggle(mod.key);
                        }}
                        disabled={disabled}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isChecked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                            {mod.label}
                          </span>
                          {isAdminOnly && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
