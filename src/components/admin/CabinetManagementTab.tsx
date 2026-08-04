import React, { FC, useState } from 'react';
import { CabinetSettings, UserRole } from '../../types/rbac';
import { initializeAllFirestoreCollections } from '../../services/initCollectionsService';
import firebaseConfigJson from '../../../firebase-applet-config.json';

interface CabinetManagementTabProps {
  onAddToast: (type: 'success' | 'error', message: string) => void;
}

export const CabinetManagementTab: FC<CabinetManagementTabProps> = ({ onAddToast }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [settings, setSettings] = useState<CabinetSettings>({
    cabinetName: 'Cabinet KBB & Associés',
    cabinetEmail: 'contact@cabinetkbb.com',
    cabinetPhone: '+243 81 555 0000',
    address: 'Avenue de la Justice, N° 14, Kinshasa - Gombe, RDC',
    taxNumber: 'A1234567B',
    rccm: 'CD/KIN/RCCM/20-B-00123',
    mainBar: 'Kinshasa-Gombe',
    secondaryBar: 'Haut-Katanga',
    defaultPermissionsByRole: {
      Admin: ['dashboard', 'ai', 'clients', 'cases', 'procedures', 'agenda', 'events', 'chat', 'correspondance', 'billing', 'avocats', 'personnels', 'suppliers', 'gestion_utilisateurs', 'gestion_cabinet', 'audit'],
      Avocat: ['dashboard', 'ai', 'clients', 'cases', 'procedures', 'agenda', 'events', 'chat', 'correspondance', 'billing', 'avocats', 'personnels', 'suppliers'],
      Personnel: ['dashboard', 'ai', 'clients', 'cases', 'procedures', 'agenda', 'events', 'chat', 'correspondance']
    },
    securityPolicy: {
      requireStrongPasswords: true,
      sessionTimeoutMinutes: 60,
      auditAllActions: true,
      restrictOfficeStaffLogin: true
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onAddToast('success', 'Paramètres d\'organisation du cabinet mis à jour avec succès.');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="bg-white dark:bg-[#0c111d] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#15447c] dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-4-8a3 3 0 100-6 3 3 0 000 6zm-5 6a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
            Paramètres et Organisation Interne du Cabinet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gérez la raison sociale, les autorisations par défaut et les politiques de sécurité globale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Dénomination Officielle
            </label>
            <input
              type="text"
              value={settings.cabinetName}
              onChange={e => setSettings({ ...settings, cabinetName: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Email Officiel du Cabinet
            </label>
            <input
              type="email"
              value={settings.cabinetEmail}
              onChange={e => setSettings({ ...settings, cabinetEmail: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Barreau Principal d'Attache
            </label>
            <input
              type="text"
              value={settings.mainBar}
              onChange={e => setSettings({ ...settings, mainBar: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Téléphone du Standard
            </label>
            <input
              type="text"
              value={settings.cabinetPhone}
              onChange={e => setSettings({ ...settings, cabinetPhone: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            N° d'immatriculation GUCE
          </label>
          <input
            type="text"
            value={settings.rccm}
            onChange={e => setSettings({ ...settings, rccm: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold"
          />
        </div>

        {/* Database & Collections Section */}
        <div className="p-5 bg-gradient-to-br from-indigo-900/10 via-slate-900/5 to-slate-900/10 dark:from-indigo-950/40 dark:to-slate-900/80 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Base de Données Firestore & Synchronisation Temps Réel
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Statut : <code className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold font-mono">base de données sécurisée</code>
              </p>
            </div>

            <button
              type="button"
              disabled={isSyncing}
              onClick={() => {
                setConfirmText('');
                setIsConfirmModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Création & Synchronisation...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Créer & Initialiser toutes les 14 Collections</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Collections Synchronisées (14/14)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                'users', 'clients', 'cases', 'events', 'tasks', 
                'invoices', 'avocats', 'personnels', 'fournisseurs', 
                'auditLogs', 'correspondances', 'presences', 'cabinet_info', 'system_settings'
              ].map(col => (
                <span key={col} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 shadow-2xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Security Policies */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Politique de Sécurité et de Confidentialité RBAC
          </h4>

          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.securityPolicy.restrictOfficeStaffLogin}
                onChange={e => setSettings({
                  ...settings,
                  securityPolicy: { ...settings.securityPolicy, restrictOfficeStaffLogin: e.target.checked }
                })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Restreindre l'accès applicatif au personnel de catégorie [Office]
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.securityPolicy.auditAllActions}
                onChange={e => setSettings({
                  ...settings,
                  securityPolicy: { ...settings.securityPolicy, auditAllActions: e.target.checked }
                })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Consigner l'intégralité des créations, éditions et suppressions dans le Journal d'Audit
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#15447c] hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
          >
            Sauvegarder les paramètres du cabinet
          </button>
        </div>
      </form>

      {/* Security Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0c111d] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Confirmation de sécurité requise
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Pour éviter toute réinitialisation accidentelle des 14 collections de la base de données Firestore, veuillez saisir le mot de confirmation <strong className="text-amber-600 dark:text-amber-400 font-mono">INITIALISER</strong> ci-dessous.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Saisissez le texte de confirmation :
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="INITIALISER"
                autoFocus
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-hidden transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setConfirmText('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={confirmText.trim().toUpperCase() !== 'INITIALISER' || isSyncing}
                onClick={async () => {
                  setIsConfirmModalOpen(false);
                  setConfirmText('');
                  setIsSyncing(true);
                  onAddToast('success', "Initialisation des 14 collections Firestore en cours...");
                  const result = await initializeAllFirestoreCollections();
                  setIsSyncing(false);
                  if (result.success) {
                    onAddToast('success', result.message);
                  } else {
                    onAddToast('error', result.message);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                {isSyncing ? (
                  <span>Initialisation...</span>
                ) : (
                  <span>Confirmer l'Initialisation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
