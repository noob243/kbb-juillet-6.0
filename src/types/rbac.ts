export type UserRole = 'Admin' | 'Avocat' | 'Personnel';

export type PersonnelCategory = 'Administratif' | 'Office';

export type FunctionRole = 
  | 'Associé' 
  | 'Senior' 
  | 'Junior' 
  | 'Stagiaire' 
  | 'Secrétaire' 
  | 'Assistant Juridique' 
  | 'Assistant de Direction' 
  | 'Gestionnaire Cabinet' 
  | 'Comptable' 
  | 'Informaticien' 
  | 'Agent d\'accueil' 
  | 'Chauffeur' 
  | 'Agent de courtoisie' 
  | 'Autre';

export type ModuleKey = 
  | 'dashboard'
  | 'ai'
  | 'clients'
  | 'cases'
  | 'procedures'
  | 'agenda'
  | 'events'
  | 'chat'
  | 'correspondance'
  | 'billing'
  | 'avocats'
  | 'personnels'
  | 'suppliers'
  | 'gestion_utilisateurs'
  | 'gestion_cabinet'
  | 'audit'
  | 'can_delete';

export interface ModulePermission {
  key: ModuleKey;
  label: string;
  category: 'Général' | 'Opérationnel' | 'Relations' | 'Administration';
  description: string;
}

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  userType: 'Avocat' | 'Personnel';
  personnelCategory?: PersonnelCategory; // 'Administratif' (Compte actif) vs 'Office' (Fiche simple sans accès applicatif)
  functionRole: FunctionRole | string;
  hasAppAccess: boolean; // false for Office personnel
  isSuperAdmin?: boolean;
  permissions: ModuleKey[];
  canDelete?: boolean; // Droit de suppression explicite (non accordé par défaut)
  isDeleted?: boolean; // Soft delete
  status: 'Actif' | 'Inactif' | 'Archivé';
  password?: string; // Mot de passe du compte (permettant la connexion immédiate)
  tempPassword?: string; // Mot de passe initial / temporaire
  phone?: string;
  photoUrl?: string;
  linkedEntityId?: string; // Id in Avocat or Personnel collection
  isOnline?: boolean;
  lastActiveAt?: string;
  forceLogout?: boolean;
  sessionRevokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  userType: 'Avocat' | 'Personnel';
  personnelCategory?: PersonnelCategory;
  functionRole: FunctionRole | string;
  phone?: string;
  hasAppAccess?: boolean;
  permissions: ModuleKey[];
  linkedEntityId?: string;
  password?: string;
  tempPassword?: string;
}

export interface CabinetSettings {
  cabinetName: string;
  cabinetEmail: string;
  cabinetPhone: string;
  address: string;
  guceNumber?: string;
  taxNumber?: string;
  rccm?: string;
  nationalId?: string;
  mainBar: string;
  secondaryBar?: string;
  defaultPermissionsByRole: Record<UserRole, ModuleKey[]>;
  securityPolicy: {
    requireStrongPasswords: boolean;
    sessionTimeoutMinutes: number;
    auditAllActions: boolean;
    restrictOfficeStaffLogin: boolean;
  };
}
