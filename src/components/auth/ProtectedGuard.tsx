import React, { FC, ReactNode } from 'react';
import { AppUser, ModuleKey, UserRole } from '../../types/rbac';
import { hasPermission, DEFAULT_ROLE_PERMISSIONS, ALL_MODULE_PERMISSIONS } from '../../services/rbacService';

interface ProtectedGuardProps {
  user: AppUser | null;
  moduleKey: ModuleKey;
  children: ReactNode;
  currentUserInfo?: { name: string; role: string; email: string } | null;
}

export const ProtectedGuard: FC<ProtectedGuardProps> = ({ user, moduleKey, children, currentUserInfo }) => {
  const effectiveUser = user || (currentUserInfo ? {
    id: 'temp',
    email: currentUserInfo.email,
    fullName: currentUserInfo.name,
    role: currentUserInfo.role as any,
    permissions: DEFAULT_ROLE_PERMISSIONS[currentUserInfo.role as UserRole] || ALL_MODULE_PERMISSIONS.map(m => m.key),
    hasAppAccess: true,
    createdAt: '',
    isDeleted: false
  } : null);

  const isAllowed = hasPermission(effectiveUser, moduleKey);

  if (!isAllowed) {
    const displayEmail = user?.email || currentUserInfo?.email || 'Non connecté';
    const displayRole = user?.role || currentUserInfo?.role || 'Utilisateur';

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/50 rounded-2xl border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 shadow-xs">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 002-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
          Accès Non Autorisé
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
          Votre compte (<strong>{displayEmail}</strong>, rôle: <strong>{displayRole}</strong>) ne possède pas les autorisations nécessaires pour accéder à ce module.
        </p>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          Veuillez contacter l'administrateur du cabinet (<strong>admin@cabinet.com</strong>) si vous estimez qu'il s'agit d'une erreur.
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
