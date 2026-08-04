import React, { FC, useState } from 'react';
import { AppUser, CreateUserPayload, FunctionRole, ModuleKey, PersonnelCategory, UserRole } from '../../types/rbac';
import { Avocat, Personnel } from '../../types';
import { ALL_MODULE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../../services/rbacService';
import { createNewUser, restoreUser, softDeleteUser, updateAppUser } from '../../services/userService';
import { PermissionMatrix } from './PermissionMatrix';
import { dbCreateDoc, sanitizeForFirestore } from '../../lib/firestoreService';
import { FormField, FormInput, FormSelect } from '../common/FormControls';

const BAR_OPTIONS = [
  'Kinshasa-Gombe',
  'Kinshasa-Matete',
  'Lualaba',
  'Haut Katanga',
  'Kwilu',
  'Kongo Central',
  'Tshopo',
  'Sud-Kivu'
];

interface UserManagementTabProps {
  users?: AppUser[];
  currentUser?: AppUser | null;
  onRefreshUsers?: () => void;
  onAddToast?: (type: 'success' | 'error', message: string) => void;
  onAddAvocat?: (avocat: Avocat, password?: string) => void;
  onAddPersonnel?: (personnel: Personnel, password?: string) => void;
}

export const UserManagementTab: FC<UserManagementTabProps> = ({
  users = [],
  currentUser = null,
  onRefreshUsers = () => {},
  onAddToast = () => {},
  onAddAvocat,
  onAddPersonnel
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'edit' | 'archive'>('create');

  // --- SUB-SECTION 1: CREATION STATE ---
  const [createType, setCreateType] = useState<'Avocat' | 'Personnel'>('Avocat');
  const [createCategory, setCreateCategory] = useState<PersonnelCategory>('Administratif');
  const [createFullName, setCreateFullName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createFunctionRole, setCreateFunctionRole] = useState<FunctionRole | string>('Senior');
  const [createPermissions, setCreatePermissions] = useState<ModuleKey[]>(DEFAULT_ROLE_PERMISSIONS.Avocat);
  const [createTempPassword, setCreateTempPassword] = useState('Cabinet2025!');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- AVOCAT & PERSONNEL CREATION FIELDS ---
  const [createOnaNumber, setCreateOnaNumber] = useState('');
  const [createFirstOathDate, setCreateFirstOathDate] = useState('');
  const [createSecondOathDate, setCreateSecondOathDate] = useState('');
  const [createServiceStartDate, setCreateServiceStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [createCabinetStatus, setCreateCabinetStatus] = useState<'Senior of counsel' | 'Senior' | 'Associé' | 'Junior'>('Senior');
  const [createServiceStatus, setCreateServiceStatus] = useState<'Actif' | 'Omis' | 'Mise en disponibilité' | 'Inactif'>('Actif');
  const [createCabinetRole, setCreateCabinetRole] = useState('');
  const [createDisciplinaryMeasures, setCreateDisciplinaryMeasures] = useState('');
  const [createSelectedBars, setCreateSelectedBars] = useState<string[]>(['Kinshasa-Gombe']);
  const [createMaritalStatus, setCreateMaritalStatus] = useState<'Célibataire' | 'Marié(e)' | 'Divorcé(e)' | 'Veuf(ve)'>('Célibataire');
  const [createPhysicalAddress, setCreatePhysicalAddress] = useState('');
  const [createHasChildren, setCreateHasChildren] = useState<'Oui' | 'Non'>('Non');
  const [createChildrenCount, setCreateChildrenCount] = useState(0);
  const [createBankAccounts, setCreateBankAccounts] = useState<Array<{ bankName: string; accountNumber: string; iban?: string; swift?: string }>>([]);
  
  // Personnel Specific Fields
  const [createSalary, setCreateSalary] = useState<number>(0);
  const [createPersonnelDisciplinaryStatus, setCreatePersonnelDisciplinaryStatus] = useState<string>('Aucune');
  const [createPersonnelDisciplinaryMeasure, setCreatePersonnelDisciplinaryMeasure] = useState<string>('');

  // --- SUB-SECTION 2: EDIT STATE ---
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Avocat');
  const [editUserType, setEditUserType] = useState<'Avocat' | 'Personnel'>('Avocat');
  const [editCategory, setEditCategory] = useState<PersonnelCategory>('Administratif');
  const [editFunctionRole, setEditFunctionRole] = useState<string>('Senior');
  const [editPermissions, setEditPermissions] = useState<ModuleKey[]>([]);
  const [editStatus, setEditStatus] = useState<'Actif' | 'Inactif' | 'Archivé'>('Actif');
  const [searchEditQuery, setSearchEditQuery] = useState('');

  // Handle bar checkbox toggles
  const handleBarCheckboxChange = (bar: string) => {
    setCreateSelectedBars(prev =>
      prev.includes(bar) ? prev.filter(b => b !== bar) : [...prev, bar]
    );
  };

  // Handle change of type during creation
  const handleCreateTypeChange = (type: 'Avocat' | 'Personnel') => {
    setCreateType(type);
    if (type === 'Avocat') {
      setCreateFunctionRole('Senior');
      setCreatePermissions(DEFAULT_ROLE_PERMISSIONS.Avocat);
    } else {
      setCreateCategory('Administratif');
      setCreateFunctionRole('Secrétaire');
      setCreatePermissions(DEFAULT_ROLE_PERMISSIONS.Personnel);
    }
  };

  const handleCreateCategoryChange = (cat: PersonnelCategory) => {
    setCreateCategory(cat);
    if (cat === 'Office') {
      setCreatePermissions([]);
    } else {
      setCreatePermissions(DEFAULT_ROLE_PERMISSIONS.Personnel);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFullName.trim() || !createEmail.trim()) {
      onAddToast('error', 'Le nom complet et l\'email sont requis.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateUserPayload = {
        fullName: createFullName,
        email: createEmail,
        phone: createPhone,
        userType: createType,
        personnelCategory: createType === 'Personnel' ? createCategory : undefined,
        functionRole: createFunctionRole,
        permissions: createType === 'Personnel' && createCategory === 'Office' ? [] : createPermissions,
        tempPassword: createTempPassword
      };

      const newUser = await createNewUser(payload);

      // If Avocat, automatically build and register Avocat entity in Avocats collection & local storage
      if (createType === 'Avocat') {
        const cleanName = createFullName.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const words = cleanName.split(/[^A-Z0-9]+/).filter(Boolean);
        let initials = words.map(w => w[0]).join('');
        if (initials.length < 2 && cleanName.length >= 3) {
          initials = cleanName.slice(0, 3).replace(/[^A-Z0-9]/g, '');
        }
        const finalInitials = initials || 'AVO';
        const generatedAvocatId = `AVO-${finalInitials}-${Date.now().toString().slice(-4)}`;

        const validBankAccounts = createBankAccounts.filter(acc => acc.bankName.trim() && acc.accountNumber.trim());

        const newAvocat: Avocat = {
          id: generatedAvocatId,
          fullName: createFullName.trim(),
          photo: null,
          photoUrl: '',
          firstOathDate: createFirstOathDate,
          secondOathDate: createSecondOathDate,
          onaNumber: createOnaNumber,
          cabinetStatus: createCabinetStatus,
          serviceStartDate: createServiceStartDate || new Date().toISOString().split('T')[0],
          serviceStatus: createServiceStatus as any,
          cabinetRole: createCabinetRole || createFunctionRole,
          phone: createPhone,
          emails: [createEmail.trim()],
          disciplinaryMeasures: createDisciplinaryMeasures,
          barreaux: createSelectedBars,
          maritalStatus: createMaritalStatus,
          physicalAddress: createPhysicalAddress,
          hasChildren: createHasChildren,
          childrenCount: createHasChildren === 'Oui' ? Number(createChildrenCount) : 0,
          mainBar: (createSelectedBars[0] as any) || 'Kinshasa-Gombe',
          secondaryBar: createSelectedBars.slice(1).join(', '),
          bankAccounts: validBankAccounts
        };

        // 1. Save directly to Firestore
        try {
          await dbCreateDoc('avocats', newAvocat.id, sanitizeForFirestore(newAvocat));
        } catch (err) {
          console.warn("Firestore avocat insert notice:", err);
        }

        // 2. Trigger callback if passed
        if (onAddAvocat) {
          try {
            await onAddAvocat(newAvocat, createTempPassword);
          } catch (e) {
            console.warn("onAddAvocat callback notice:", e);
          }
        }
      } else if (createType === 'Personnel') {
        // Build and register Personnel entity in Personnels collection & local storage
        const cleanName = createFullName.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const words = cleanName.split(/[^A-Z0-9]+/).filter(Boolean);
        let initials = words.map(w => w[0]).join('');
        if (initials.length < 2 && cleanName.length >= 3) {
          initials = cleanName.slice(0, 3).replace(/[^A-Z0-9]/g, '');
        }
        const finalInitials = initials || 'PER';
        const generatedPersonnelId = `PER-${finalInitials}-${Date.now().toString().slice(-4)}`;

        const validBankAccounts = createBankAccounts.filter(acc => acc.bankName.trim() && acc.accountNumber.trim());

        const newPersonnel: Personnel = {
          id: generatedPersonnelId,
          fullName: createFullName.trim(),
          role: createFunctionRole,
          category: createCategory,
          email: createEmail.trim(),
          phone: createPhone.trim(),
          salary: Number(createSalary) || 0,
          serviceStartDate: createServiceStartDate || new Date().toISOString().split('T')[0],
          serviceStatus: (createServiceStatus as any) || 'Actif',
          maritalStatus: createMaritalStatus,
          hasChildren: createHasChildren,
          childrenCount: createHasChildren === 'Oui' ? Number(createChildrenCount) : 0,
          address: createPhysicalAddress,
          disciplinaryStatus: createPersonnelDisciplinaryStatus || 'Aucune',
          disciplinaryMeasure: createPersonnelDisciplinaryMeasure || createDisciplinaryMeasures || '',
          photo: null,
          bankAccounts: validBankAccounts
        };

        // 1. Save directly to Firestore under personnels
        try {
          await dbCreateDoc('personnels', newPersonnel.id, sanitizeForFirestore(newPersonnel));
        } catch (err) {
          console.warn("Firestore personnel insert notice:", err);
        }

        // 2. Trigger callback if passed
        if (onAddPersonnel) {
          try {
            await onAddPersonnel(newPersonnel, createTempPassword);
          } catch (e) {
            console.warn("onAddPersonnel callback notice:", e);
          }
        }
      }

      onAddToast('success', `Compte utilisateur ${newUser.fullName} ${createType === 'Avocat' ? 'et fiche Avocat' : 'et fiche Personnel'} créés avec succès !`);
      
      // Reset form
      setCreateFullName('');
      setCreateEmail('');
      setCreatePhone('');
      setCreateOnaNumber('');
      setCreateFirstOathDate('');
      setCreateSecondOathDate('');
      setCreateCabinetRole('');
      setCreateDisciplinaryMeasures('');
      setCreatePhysicalAddress('');
      setCreateHasChildren('Non');
      setCreateChildrenCount(0);
      setCreateSalary(0);
      setCreatePersonnelDisciplinaryStatus('Aucune');
      setCreatePersonnelDisciplinaryMeasure('');
      setCreateBankAccounts([]);
      setCreatePermissions(DEFAULT_ROLE_PERMISSIONS.Avocat);
      onRefreshUsers();
    } catch (err: any) {
      console.error("Failed to create user:", err);
      onAddToast('error', err.message || 'Erreur lors de la création de l\'utilisateur.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Editing a user
  const startEditUser = (user: AppUser) => {
    setEditingUserId(user.id);
    setEditFullName(user.fullName);
    setEditEmail(user.email);
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditUserType(user.userType);
    setEditCategory(user.personnelCategory || 'Administratif');
    setEditFunctionRole(user.functionRole);
    setEditPermissions(user.permissions || []);
    setEditStatus(user.status || 'Actif');
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    try {
      await updateAppUser(editingUserId, {
        fullName: editFullName,
        email: editEmail,
        phone: editPhone,
        role: editRole,
        userType: editUserType,
        personnelCategory: editUserType === 'Personnel' ? editCategory : undefined,
        functionRole: editFunctionRole,
        permissions: editUserType === 'Personnel' && editCategory === 'Office' ? [] : editPermissions,
        status: editStatus
      });

      onAddToast('success', 'Profil et autorisations mis à jour avec succès.');
      setEditingUserId(null);
      onRefreshUsers();
    } catch (err: any) {
      onAddToast('error', 'Impossible de mettre à jour le profil.');
    }
  };

  const handleSoftDelete = async (user: AppUser) => {
    if (user.role === 'Admin' && (users || []).filter(u => u.role === 'Admin' && !u.isDeleted).length <= 1) {
      onAddToast('error', 'Impossible d\'archiver le seul administrateur actif du cabinet.');
      return;
    }

    if (window.confirm(`Confirmez-vous l'archivage sécurisé (soft-delete) du compte de ${user.fullName} ?`)) {
      try {
        await softDeleteUser(user.id);
        onAddToast('success', `Le compte de ${user.fullName} a été archivé avec succès.`);
        onRefreshUsers();
      } catch (err) {
        onAddToast('error', 'Erreur lors de l\'archivage du compte.');
      }
    }
  };

  const handleRestore = async (user: AppUser) => {
    try {
      await restoreUser(user.id);
      onAddToast('success', `Le compte de ${user.fullName} a été réactivé avec succès.`);
      onRefreshUsers();
    } catch (err) {
      onAddToast('error', 'Erreur lors de la réactivation du compte.');
    }
  };

  const safeUsersList = users || [];
  const activeUsers = safeUsersList.filter(u => !u.isDeleted);
  const archivedUsers = safeUsersList.filter(u => u.isDeleted);

  const query = (searchEditQuery || '').toLowerCase();
  const filteredActiveUsers = activeUsers.filter(u => 
    (u.fullName || '').toLowerCase().includes(query) ||
    (u.email || '').toLowerCase().includes(query) ||
    (u.functionRole || '').toLowerCase().includes(query)
  );

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('create')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'create'
              ? 'bg-white dark:bg-slate-800 text-[#15447c] dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          1. Création d'un utilisateur
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('edit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'edit'
              ? 'bg-white dark:bg-slate-800 text-[#15447c] dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          2. Modification & Profils ({activeUsers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('archive')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'archive'
              ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          3. Suppression & Archivage ({archivedUsers.length})
        </button>
      </div>

      {/* ==================================================================== */}
      {/* SUB-SECTION 1: CRÉATION D'UN UTILISATEUR */}
      {/* ==================================================================== */}
      {activeSubTab === 'create' && (
        <form onSubmit={handleCreateSubmit} className="bg-white dark:bg-[#0c111d] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">
                1
              </span>
              Créer un Nouvel Utilisateur du Cabinet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configurez le type d'utilisateur, le rôle/fonction et la matrice d'autorisations explicites.
            </p>
          </div>

          {/* Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Type de Compte / Profil *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateTypeChange('Avocat')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    createType === 'Avocat'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  [Avocat]
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateTypeChange('Personnel')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    createType === 'Personnel'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  [Personnel]
                </button>
              </div>
            </div>

            {/* Personnel Category Conditional Field */}
            {createType === 'Personnel' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Catégorie du Personnel *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateCategoryChange('Administratif')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center text-center transition ${
                      createCategory === 'Administratif'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Administratif</span>
                    </div>
                    <span className="text-[9px] font-normal opacity-80 mt-0.5">(Accès application / Utilisateur)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCreateCategoryChange('Office')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center text-center transition ${
                      createCategory === 'Office'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>Office</span>
                    </div>
                    <span className="text-[9px] font-normal opacity-80 mt-0.5">(Fiche simple / Pas d'accès app)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Statut Cabinet
                </label>
                <input
                  type="text"
                  disabled
                  value="Avocat Inscrit au Barreau"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                />
              </div>
            )}
          </div>

          {/* User Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Nom complet" required>
              <FormInput
                type="text"
                required
                value={createFullName}
                onChange={e => setCreateFullName(e.target.value)}
                placeholder="ex: Me. Patrick Mbuyi"
              />
            </FormField>

            <FormField label="Adresse Email Professionnelle" required>
              <FormInput
                type="email"
                required
                value={createEmail}
                onChange={e => setCreateEmail(e.target.value)}
                placeholder="p.mbuyi@cabinet.com"
              />
            </FormField>

            <FormField label="Fonction / Rôle" required>
              <FormSelect
                value={createFunctionRole}
                onChange={e => setCreateFunctionRole(e.target.value)}
              >
                {createType === 'Avocat' ? (
                  <>
                    <option value="Associé">Associé</option>
                    <option value="Senior">Senior</option>
                    <option value="Junior">Junior</option>
                    <option value="Stagiaire">Stagiaire Barreau</option>
                  </>
                ) : (
                  <>
                    <option value="Secrétaire">Secrétaire</option>
                    <option value="Assistant Juridique">Assistant Juridique</option>
                    <option value="Assistant de Direction">Assistant de Direction</option>
                    <option value="Gestionnaire Cabinet">Gestionnaire Cabinet</option>
                    <option value="Comptable">Comptable</option>
                    <option value="Agent d'accueil">Agent d'accueil</option>
                    <option value="Chauffeur">Chauffeur</option>
                    <option value="Agent de courtoisie">Agent de courtoisie</option>
                    <option value="Autre">Autre</option>
                  </>
                )}
              </FormSelect>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Téléphone">
              <FormInput
                type="text"
                value={createPhone}
                onChange={e => setCreatePhone(e.target.value)}
                placeholder="+243 81 000 0000"
              />
            </FormField>

            <FormField label="Mot de passe temporaire">
              <FormInput
                type="text"
                value={createTempPassword}
                onChange={e => setCreateTempPassword(e.target.value)}
              />
            </FormField>
          </div>

          {/* Specific Avocat Registration Section */}
          {createType === 'Avocat' && (
            <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-indigo-100 dark:border-indigo-900/40 pb-2.5">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                  Fiche Barreau & Données d'Inscription de l'Avocat
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    N° Ordre National des Avocats (ONA)
                  </label>
                  <input
                    type="text"
                    value={createOnaNumber}
                    onChange={e => setCreateOnaNumber(e.target.value)}
                    placeholder="ex: ONA/8492"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Statut au Cabinet
                  </label>
                  <select
                    value={createCabinetStatus}
                    onChange={e => setCreateCabinetStatus(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <option value="Associé">Associé</option>
                    <option value="Senior">Senior</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior of counsel">Senior of counsel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Statut de Service
                  </label>
                  <select
                    value={createServiceStatus}
                    onChange={e => setCreateServiceStatus(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <option value="Actif">Actif</option>
                    <option value="Omis">Omis</option>
                    <option value="Mise en disponibilité">Mise en disponibilité</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date Prestation 1er Serment
                  </label>
                  <input
                    type="date"
                    value={createFirstOathDate}
                    onChange={e => setCreateFirstOathDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date Prestation 2ème Serment
                  </label>
                  <input
                    type="date"
                    value={createSecondOathDate}
                    onChange={e => setCreateSecondOathDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date Début Prestation au Cabinet
                  </label>
                  <input
                    type="date"
                    value={createServiceStartDate}
                    onChange={e => setCreateServiceStartDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Barreaux d'attache */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Barreaux d'attache / d'inscription *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BAR_OPTIONS.map(bar => {
                    const isChecked = createSelectedBars.includes(bar);
                    return (
                      <button
                        key={bar}
                        type="button"
                        onClick={() => handleBarCheckboxChange(bar)}
                        className={`p-2 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border ${isChecked ? 'border-white bg-white/20' : 'border-slate-300'}`}>
                          {isChecked && '✓'}
                        </span>
                        <span className="truncate">{bar}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* État civil & Adresse */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    État Civil
                  </label>
                  <select
                    value={createMaritalStatus}
                    onChange={e => setCreateMaritalStatus(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <option value="Célibataire">Célibataire</option>
                    <option value="Marié(e)">Marié(e)</option>
                    <option value="Divorcé(e)">Divorcé(e)</option>
                    <option value="Veuf(ve)">Veuf(ve)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Enfants à charge
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={createHasChildren}
                      onChange={e => setCreateHasChildren(e.target.value as any)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                    >
                      <option value="Non">Non</option>
                      <option value="Oui">Oui</option>
                    </select>
                    {createHasChildren === 'Oui' && (
                      <input
                        type="number"
                        min={1}
                        value={createChildrenCount}
                        onChange={e => setCreateChildrenCount(Number(e.target.value))}
                        placeholder="Nombre"
                        className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Adresse physique / Domicile
                  </label>
                  <input
                    type="text"
                    value={createPhysicalAddress}
                    onChange={e => setCreatePhysicalAddress(e.target.value)}
                    placeholder="ex: Av. de la Justice 42, Gombe"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mesures disciplinaires (si applicable)
                </label>
                <input
                  type="text"
                  value={createDisciplinaryMeasures}
                  onChange={e => setCreateDisciplinaryMeasures(e.target.value)}
                  placeholder="Avertissement, blâme ou Néant"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Comptes Bancaires */}
              <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Comptes Bancaires Associés
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateBankAccounts(prev => [...prev, { bankName: '', accountNumber: '', iban: '', swift: '' }])}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                  >
                    + Ajouter un compte
                  </button>
                </div>

                {createBankAccounts.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Aucun compte bancaire renseigné.</p>
                ) : (
                  <div className="space-y-2">
                    {createBankAccounts.map((acc, index) => (
                      <div key={`bank-avocat-${index}-${acc.accountNumber}`} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 relative">
                        <input
                          type="text"
                          value={acc.bankName}
                          onChange={e => {
                            const newAccs = [...createBankAccounts];
                            newAccs[index].bankName = e.target.value;
                            setCreateBankAccounts(newAccs);
                          }}
                          placeholder="Nom de la Banque"
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200"
                        />
                        <input
                          type="text"
                          value={acc.accountNumber}
                          onChange={e => {
                            const newAccs = [...createBankAccounts];
                            newAccs[index].accountNumber = e.target.value;
                            setCreateBankAccounts(newAccs);
                          }}
                          placeholder="N° de Compte"
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200"
                        />
                        <input
                          type="text"
                          value={acc.iban || ''}
                          onChange={e => {
                            const newAccs = [...createBankAccounts];
                            newAccs[index].iban = e.target.value;
                            setCreateBankAccounts(newAccs);
                          }}
                          placeholder="IBAN / Code (Optionnel)"
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200"
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={acc.swift || ''}
                            onChange={e => {
                              const newAccs = [...createBankAccounts];
                              newAccs[index].swift = e.target.value;
                              setCreateBankAccounts(newAccs);
                            }}
                            placeholder="SWIFT (Optionnel)"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => setCreateBankAccounts(prev => prev.filter((_, i) => i !== index))}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition font-bold"
                            title="Supprimer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Specific Personnel Registration Section */}
          {createType === 'Personnel' && (
            <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-indigo-100 dark:border-indigo-900/40 pb-2.5">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                  Fiche & Données d'Enregistrement du Membre du Personnel ({createCategory})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date d'Entrée en Service
                  </label>
                  <input
                    type="date"
                    value={createServiceStartDate}
                    onChange={e => setCreateServiceStartDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Statut de Service
                  </label>
                  <select
                    value={createServiceStatus}
                    onChange={e => setCreateServiceStatus(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                    <option value="Mise en disponibilité">Mise en disponibilité</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Salaire Mensuel ($ USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={createSalary}
                    onChange={e => setCreateSalary(Number(e.target.value))}
                    placeholder="ex: 850"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* État civil & Domicile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    État Civil
                  </label>
                  <select
                    value={createMaritalStatus}
                    onChange={e => setCreateMaritalStatus(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <option value="Célibataire">Célibataire</option>
                    <option value="Marié(e)">Marié(e)</option>
                    <option value="Divorcé(e)">Divorcé(e)</option>
                    <option value="Veuf(ve)">Veuf(ve)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Enfants à charge
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={createHasChildren}
                      onChange={e => setCreateHasChildren(e.target.value as any)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                    >
                      <option value="Non">Non</option>
                      <option value="Oui">Oui</option>
                    </select>
                    {createHasChildren === 'Oui' && (
                      <input
                        type="number"
                        min={1}
                        value={createChildrenCount}
                        onChange={e => setCreateChildrenCount(Number(e.target.value))}
                        placeholder="Nombre"
                        className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 font-mono"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Adresse physique / Domicile
                  </label>
                  <input
                    type="text"
                    value={createPhysicalAddress}
                    onChange={e => setCreatePhysicalAddress(e.target.value)}
                    placeholder="ex: Av. Colonel Ebeya 15, Gombe"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Disciplinary & Sanctions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-indigo-100 dark:border-indigo-900/40">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mesures Disciplinaires / Statut Sanction
                  </label>
                  <select
                    value={createPersonnelDisciplinaryStatus}
                    onChange={e => setCreatePersonnelDisciplinaryStatus(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <option value="Aucune">Aucune mesure</option>
                    <option value="En cours d'instruction">En cours d'instruction</option>
                    <option value="Avertissement oral">Avertissement oral</option>
                    <option value="Avertissement écrit">Avertissement écrit</option>
                    <option value="Blâme">Blâme</option>
                    <option value="Mise à pied">Mise à pied</option>
                    <option value="Suspension temporaire">Suspension temporaire</option>
                    <option value="Licenciement">Licenciement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Motifs / Détails de la mesure disciplinaire
                  </label>
                  <input
                    type="text"
                    value={createPersonnelDisciplinaryMeasure}
                    onChange={e => setCreatePersonnelDisciplinaryMeasure(e.target.value)}
                    placeholder="Précisions..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Comptes Bancaires pour Personnel */}
              <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Comptes Bancaires Associés
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateBankAccounts(prev => [...prev, { bankName: '', accountNumber: '', iban: '', swift: '' }])}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                  >
                    + Ajouter un compte
                  </button>
                </div>

                {createBankAccounts.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Aucun compte bancaire renseigné.</p>
                ) : (
                  <div className="space-y-2">
                    {createBankAccounts.map((acc, index) => (
                      <div key={`bank-personnel-${index}-${acc.accountNumber}`} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 relative">
                        <input
                          type="text"
                          value={acc.bankName}
                          onChange={e => {
                            const newAccs = [...createBankAccounts];
                            newAccs[index].bankName = e.target.value;
                            setCreateBankAccounts(newAccs);
                          }}
                          placeholder="Nom de la Banque"
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200"
                        />
                        <input
                          type="text"
                          value={acc.accountNumber}
                          onChange={e => {
                            const newAccs = [...createBankAccounts];
                            newAccs[index].accountNumber = e.target.value;
                            setCreateBankAccounts(newAccs);
                          }}
                          placeholder="N° de Compte"
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200"
                        />
                        <input
                          type="text"
                          value={acc.iban || ''}
                          onChange={e => {
                            const newAccs = [...createBankAccounts];
                            newAccs[index].iban = e.target.value;
                            setCreateBankAccounts(newAccs);
                          }}
                          placeholder="IBAN / Code (Optionnel)"
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200"
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={acc.swift || ''}
                            onChange={e => {
                              const newAccs = [...createBankAccounts];
                              newAccs[index].swift = e.target.value;
                              setCreateBankAccounts(newAccs);
                            }}
                            placeholder="SWIFT (Optionnel)"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => setCreateBankAccounts(prev => prev.filter((_, i) => i !== index))}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition font-bold"
                            title="Supprimer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Permission Matrix */}
          {createType === 'Personnel' && createCategory === 'Office' ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl text-amber-800 dark:text-amber-300 text-xs">
              <strong>Notice Personnel [Office] :</strong> Cet utilisateur est enregistré uniquement à titre de fiche d'information interne. Aucun accès applicatif ni identifiant de connexion ne sera créé.
            </div>
          ) : (
            <PermissionMatrix
              selectedPermissions={createPermissions}
              onChange={setCreatePermissions}
            />
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#15447c] hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Création en cours...</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Créer et Activer le Compte</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ==================================================================== */}
      {/* SUB-SECTION 2: MODIFICATION / PROFILS */}
      {/* ==================================================================== */}
      {activeSubTab === 'edit' && (
        <div className="bg-white dark:bg-[#0c111d] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">
                  2
                </span>
                Modification des Utilisateurs & Ajustement des Droits
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gérez les données personnelles, ajustez dynamiquement les rôles et permissions d'accès.
              </p>
            </div>

            <div className="w-full md:w-64">
              <input
                type="text"
                value={searchEditQuery}
                onChange={e => setSearchEditQuery(e.target.value)}
                placeholder="Rechercher nom, email, rôle..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* User List Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                  <th className="p-3">Utilisateur</th>
                  <th className="p-3">Profil & Rôle</th>
                  <th className="p-3">Fonction</th>
                  <th className="p-3">Accès App</th>
                  <th className="p-3">Modules Permis</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredActiveUsers.map((u, index) => (
                  <tr key={u.id ? `active-${u.id}` : `active-user-${u.email || index}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                      <div>{u.fullName}</div>
                      <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">{u.email}</div>
                    </td>
                    <td className="p-3 font-semibold">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        u.role === 'Admin' 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : u.userType === 'Avocat'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {u.role === 'Admin' ? 'Administrateur' : u.userType}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                      {u.functionRole}
                    </td>
                    <td className="p-3">
                      {u.hasAppAccess ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                          Compte Actif
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          Sans Accès (Office)
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-medium text-slate-600 dark:text-slate-400">
                      {u.role === 'Admin' ? 'Accès Total (16/16)' : `${u.permissions?.length || 0} modules`}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEditUser(u)}
                        className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg font-bold text-xs transition"
                      >
                        Éditer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit Modal / Form Drawer */}
          {editingUserId && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white dark:bg-[#0c111d] max-w-2xl w-full p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Modifier le profil et autorisations de : {editFullName}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingUserId(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleEditSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nom complet
                      </label>
                      <input
                        type="text"
                        value={editFullName}
                        onChange={e => setEditFullName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Adresse Email
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Rôle Global
                      </label>
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as UserRole)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium"
                      >
                        <option value="Admin">Admin (Contrôle Total)</option>
                        <option value="Avocat">Avocat</option>
                        <option value="Personnel">Personnel</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Fonction / Poste
                      </label>
                      <input
                        type="text"
                        value={editFunctionRole}
                        onChange={e => setEditFunctionRole(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium"
                      />
                    </div>
                  </div>

                  {editRole !== 'Admin' && (
                    <PermissionMatrix
                      selectedPermissions={editPermissions}
                      onChange={setEditPermissions}
                    />
                  )}

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
                    >
                      Annuler
                    </button>

                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md"
                    >
                      Enregistrer les modifications
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-SECTION 3: SUPPRESSION / ARCHIVAGE */}
      {/* ==================================================================== */}
      {activeSubTab === 'archive' && (
        <div className="bg-white dark:bg-[#0c111d] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-black">
                3
              </span>
              Archivage Sécurisé & Réactivation des Comptes (Soft-Delete)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Désactivez temporairement ou réactivez les comptes tout en conservant l'intégrité de l'historique d'audit.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Users for Soft Delete */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                <span>Comptes Actifs ({activeUsers.length})</span>
                <span className="text-[10px] font-normal text-slate-500">Cliquez pour archiver</span>
              </h4>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {activeUsers.map((u, index) => (
                  <div
                    key={u.id ? `softdel-${u.id}` : `softdel-user-${u.email || index}`}
                    className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{u.fullName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{u.email} • {u.functionRole}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSoftDelete(u)}
                      className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg text-xs font-bold border border-rose-200 dark:border-rose-900 transition"
                    >
                      Archiver
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Archived Users */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center justify-between">
                <span>Comptes Archivés ({archivedUsers.length})</span>
                <span className="text-[10px] font-normal text-slate-500">Cliquez pour restaurer</span>
              </h4>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {archivedUsers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    Aucun compte utilisateur n'est archivé actuellement.
                  </div>
                ) : (
                  archivedUsers.map((u, index) => (
                    <div
                      key={u.id ? `archived-${u.id}` : `archived-user-${u.email || index}`}
                      className="p-3 bg-rose-50/30 dark:bg-rose-950/20 rounded-xl border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-through opacity-75">{u.fullName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{u.email} • Archivé</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestore(u)}
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-900 transition"
                      >
                        Réactiver
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
