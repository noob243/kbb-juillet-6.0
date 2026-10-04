import { ModuleKey, ModulePermission, UserRole, AppUser } from '../types/rbac';
import { Case } from '../types';

export const ALL_MODULE_PERMISSIONS: ModulePermission[] = [
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    category: 'Général',
    description: 'Vue d\'ensemble des activités, kpi et statistiques du cabinet'
  },
  {
    key: 'ai',
    label: 'Otshudi AI (Assistant)',
    category: 'Général',
    description: 'Assistant IA juridique pour synthèse de pièces et conseils'
  },
  {
    key: 'clients',
    label: 'Répertoire Clients',
    category: 'Opérationnel',
    description: 'Gestion des fiches clients, contacts et référents'
  },
  {
    key: 'cases',
    label: 'Gestion des Dossiers',
    category: 'Opérationnel',
    description: 'Création, suivi, pièces jointes et avocats titulaires des dossiers'
  },
  {
    key: 'procedures',
    label: 'Suivi des Procédures',
    category: 'Opérationnel',
    description: 'Suivi des instances judiciaires et juridictions'
  },
  {
    key: 'agenda',
    label: 'Agenda & Tâches',
    category: 'Opérationnel',
    description: 'Planning, rappels sonores et attribution de tâches'
  },
  {
    key: 'events',
    label: 'Événements & Colloques',
    category: 'Opérationnel',
    description: 'Organisation de séminaires, budgets et rapports d\'événements'
  },
  {
    key: 'chat',
    label: 'Messagerie Interne',
    category: 'Opérationnel',
    description: 'Canaux de discussion et messages directs entre collaborateurs'
  },
  {
    key: 'correspondance',
    label: 'Correspondance & Courriers',
    category: 'Opérationnel',
    description: 'Rédaction, archivage et suivi des lettres/mises en demeure'
  },
  {
    key: 'billing',
    label: 'Facturation & Recouvrement',
    category: 'Relations',
    description: 'Création de factures, encaissements et suivi des impayés'
  },
  {
    key: 'avocats',
    label: 'Annuaire des Avocats',
    category: 'Relations',
    description: 'Répertoire des avocats du cabinet et barreaux d\'appartenance'
  },
  {
    key: 'personnels',
    label: 'Registre du Personnel',
    category: 'Relations',
    description: 'Fiches administratives du personnel permanent/temporaire'
  },
  {
    key: 'suppliers',
    label: 'Fournisseurs & Prestataires',
    category: 'Relations',
    description: 'Fiches fournisseurs et contrats de prestations'
  },
  {
    key: 'gestion_utilisateurs',
    label: 'Gestion des Utilisateurs & Rôles',
    category: 'Administration',
    description: 'Administration des comptes applicatifs et matrices d\'autorisations RBAC'
  },
  {
    key: 'gestion_cabinet',
    label: 'Gestion du Cabinet',
    category: 'Administration',
    description: 'Paramètres généraux du cabinet KBB et règles d\'accès'
  },
  {
    key: 'audit',
    label: 'Journal d\'Audit',
    category: 'Administration',
    description: 'Traces et historique de toutes les actions réalisées sur l\'application'
  },
  {
    key: 'can_delete',
    label: 'Droit de suppression des données',
    category: 'Administration',
    description: 'Droit sensible : autorise la suppression définitive ou l\'archivage irréversible (dossiers, clients, factures, personnel). Doit être octroyé expressément et n\'est pas accordé par défaut.'
  },
  {
    key: 'presentation',
    label: 'Présentation PPT',
    category: 'Général',
    description: 'Présentation du cabinet'
  }
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, ModuleKey[]> = {
  Admin: [
    'dashboard',
    'ai',
    'clients',
    'cases',
    'procedures',
    'agenda',
    'events',
    'chat',
    'correspondance',
    'billing',
    'avocats',
    'personnels',
    'suppliers',
    'gestion_utilisateurs',
    'gestion_cabinet',
    'audit',
    'can_delete'
  ],
  Avocat: [
    'dashboard',
    'ai',
    'clients',
    'cases',
    'procedures',
    'agenda',
    'events',
    'chat',
    'correspondance',
    'billing',
    'avocats',
    'personnels',
    'suppliers'
  ],
  Personnel: [
    'dashboard',
    'ai',
    'clients',
    'cases',
    'procedures',
    'agenda',
    'events',
    'chat',
    'correspondance'
  ]
};

export function hasPermission(user: AppUser | null, moduleKey: ModuleKey): boolean {
  if (!user) return false;
  if (user.isDeleted) return false;
  if (user.hasAppAccess === false) return false;
  
  // Specific check for 'can_delete'
  if (moduleKey === 'can_delete') {
    return canDeleteRecord(user);
  }

  // Primary Super Admin check
  const isSuperAdmin = user.role === 'Admin' ||
    user.isSuperAdmin === true ||
    user.email === 'jeremieshusu4@gmail.com' ||
    user.email === 'hervemich@icloud.com' ||
    user.email === 'patbonles@gmail.com' ||
    user.email === 'admin@cabinet.com';
  
  if (isSuperAdmin) return true;

  // For all other users, check permissions array configured in the Matrix
  return Array.isArray(user.permissions) && user.permissions.includes(moduleKey);
}

export function canDeleteRecord(user: AppUser | Partial<AppUser> | { role?: string; email?: string; permissions?: string[]; canDelete?: boolean; isSuperAdmin?: boolean; isDeleted?: boolean; hasAppAccess?: boolean } | null | undefined): boolean {
  if (!user) return false;
  if (user.isDeleted) return false;
  if (user.hasAppAccess === false) return false;

  // 1. Tous les administrateurs ont le droit de suppression par défaut
  if (user.role === 'Admin' || user.isSuperAdmin === true || (typeof user.role === 'string' && user.role.toLowerCase().includes('admin'))) {
    return true;
  }

  // 2. Administrateurs système identifiés par email
  const adminEmails = [
    'jeremieshusu4@gmail.com',
    'hervemich@icloud.com',
    'patbonles@gmail.com',
    'admin@cabinet.com'
  ];
  if (user.email && adminEmails.includes(user.email.toLowerCase().trim())) {
    return true;
  }

  // 3. Pour tous les autres rôles (Avocats, Personnels), le droit de suppression doit impérativement leur être octroyé expressément par un administrateur
  return (Array.isArray(user.permissions) && user.permissions.includes('can_delete')) || user.canDelete === true;
}

/**
 * Vérifie si un dossier a son contenu masqué / restreint
 */
export function isCaseContentMasked(caseItem: Partial<Case> | null | undefined): boolean {
  if (!caseItem) return false;
  return Boolean(caseItem.isContentMasked || caseItem.isConfidential);
}

/**
 * Vérifie si un utilisateur est habilité à masquer ou rendre ouvert le contenu d'un dossier
 * Règle : Réservé aux Administrateurs et aux Avocats Titulaires (ou Associés / Seniors)
 */
export function canManageCaseConfidentiality(
  user: AppUser | Partial<AppUser> | { role?: string; email?: string; fullName?: string; name?: string; functionRole?: string; isSuperAdmin?: boolean; permissions?: string[] } | null | undefined,
  caseItem?: Partial<Case> | null
): boolean {
  if (!user) return false;

  // 1. Tous les administrateurs ont le droit de masquer ou rendre ouvert le contenu
  if (user.role === 'Admin' || user.isSuperAdmin === true || (typeof user.role === 'string' && user.role.toLowerCase().includes('admin'))) {
    return true;
  }

  const adminEmails = [
    'jeremieshusu4@gmail.com',
    'hervemich@icloud.com',
    'patbonles@gmail.com',
    'admin@cabinet.com'
  ];
  if (user.email && adminEmails.includes(user.email.toLowerCase().trim())) {
    return true;
  }

  // 2. Vérification pour le profil Avocat
  const isAvocat = user.role === 'Avocat' || 
                   (user as any).userType === 'Avocat' || 
                   (typeof user.role === 'string' && user.role.toLowerCase().includes('avocat'));

  if (!isAvocat) return false;

  // 2a. Si un dossier spécifique est passé, vérifier si cet avocat est l'avocat titulaire
  if (caseItem && caseItem.avocatTitulaire) {
    const rawTitulaire = caseItem.avocatTitulaire.toLowerCase();
    const userName = (user.fullName || (user as any).name || '').toLowerCase().trim();
    const userEmail = (user.email || '').toLowerCase().trim();

    const cleanUserName = userName.replace(/^(me|maître|maitre)\s+/i, '').trim();
    const cleanTitulaire = rawTitulaire.replace(/^(me|maître|maitre)\s+/i, '').trim();

    if (cleanUserName && (rawTitulaire.includes(cleanUserName) || cleanTitulaire.includes(cleanUserName))) {
      return true;
    }
    if (userEmail && rawTitulaire.includes(userEmail)) {
      return true;
    }
  }

  // 2b. Les avocats Associés, Titulaires ou Seniors disposent de cette prérogative
  const func = (user.functionRole || '').toLowerCase();
  if (func.includes('associé') || func.includes('associe') || func.includes('titulaire') || func.includes('senior')) {
    return true;
  }

  return false;
}

/**
 * Vérifie si un utilisateur a le droit de voir le contenu confidentiel (notes, pièces internes)
 * Si le dossier est ouvert (non masqué), tout le monde ayant accès aux dossiers peut le voir.
 * Si le dossier est masqué, seuls les Admins et l'Avocat Titulaire peuvent consulter ce contenu.
 */
export function canViewRestrictedCaseContent(
  user: AppUser | Partial<AppUser> | { role?: string; email?: string; fullName?: string; name?: string; functionRole?: string; isSuperAdmin?: boolean } | null | undefined,
  caseItem: Partial<Case> | null | undefined
): boolean {
  if (!caseItem) return true;
  if (!isCaseContentMasked(caseItem)) return true;
  return canManageCaseConfidentiality(user, caseItem);
}

/**
 * Vérifie si un utilisateur a le droit de voir les statistiques financières ou informations de facturation sur le tableau de bord
 * Règle utilisateur : Réservé EXCLUSIVEMENT aux Administrateurs et aux Associés (Partners)
 */
export function canViewFinancialStats(
  user: AppUser | Partial<AppUser> | { role?: string; email?: string; fullName?: string; name?: string; functionRole?: string; isSuperAdmin?: boolean; cabinetStatus?: string } | null | undefined,
  userInfo?: { name?: string; role?: string; email?: string; functionRole?: string } | null
): boolean {
  const effectiveUser = user || userInfo ? { ...(user || {}), ...(userInfo || {}) } : null;
  if (!effectiveUser) return false;
  if ((effectiveUser as any).isDeleted) return false;
  if ((effectiveUser as any).hasAppAccess === false) return false;

  // 1. Tous les administrateurs
  if (effectiveUser.role === 'Admin' || effectiveUser.isSuperAdmin === true || (typeof effectiveUser.role === 'string' && effectiveUser.role.toLowerCase().includes('admin'))) {
    return true;
  }

  const adminEmails = [
    'jeremieshusu4@gmail.com',
    'hervemich@icloud.com',
    'patbonles@gmail.com',
    'admin@cabinet.com'
  ];
  if (effectiveUser.email && adminEmails.includes(effectiveUser.email.toLowerCase().trim())) {
    return true;
  }

  // 2. Associés (Avocats Associés / Partners du cabinet)
  const func = (effectiveUser.functionRole || '').toLowerCase();
  const cabStatus = ((effectiveUser as any).cabinetStatus || '').toLowerCase();
  const role = (effectiveUser.role || '').toLowerCase();

  if (
    func.includes('associé') || func.includes('associe') || func.includes('partner') ||
    cabStatus.includes('associé') || cabStatus.includes('associe') ||
    role.includes('associé') || role.includes('associe')
  ) {
    return true;
  }

  return false;
}

export function canViewPresentation(
  user: AppUser | Partial<AppUser> | { role?: string; email?: string; fullName?: string; name?: string; functionRole?: string; isSuperAdmin?: boolean; cabinetStatus?: string } | null | undefined
): boolean {
  if (!user) return false;
  if ((user as any).isDeleted) return false;
  if ((user as any).hasAppAccess === false) return false;

  // 1. Tous les administrateurs
  if (user.role === 'Admin' || user.isSuperAdmin === true || (typeof user.role === 'string' && user.role.toLowerCase().includes('admin'))) {
    return true;
  }

  const adminEmails = [
    'jeremieshusu4@gmail.com',
    'hervemich@icloud.com',
    'patbonles@gmail.com',
    'admin@cabinet.com'
  ];
  if (user.email && adminEmails.includes(user.email.toLowerCase().trim())) {
    return true;
  }

  // 2. Associés (Avocats Associés / Partners du cabinet)
  const func = (user.functionRole || '').toLowerCase();
  const cabStatus = ((user as any).cabinetStatus || '').toLowerCase();
  const role = (user.role || '').toLowerCase();

  if (
    func.includes('associé') || func.includes('associe') || func.includes('partner') ||
    cabStatus.includes('associé') || cabStatus.includes('associe') ||
    role.includes('associé') || role.includes('associe')
  ) {
    return true;
  }

  return false;
}

export function filterNavItemsByPermissions<T extends { name: string; isGroup?: boolean; subItems?: { name: string }[] }>(
  items: T[],
  user: AppUser | null
): T[] {
  if (!user) return [];
  if (user.isDeleted || user.hasAppAccess === false) return [];

  const isSuperAdmin = user.role === 'Admin' ||
    user.isSuperAdmin === true ||
    user.email === 'jeremieshusu4@gmail.com' ||
    user.email === 'hervemich@icloud.com' ||
    user.email === 'patbonles@gmail.com' ||
    user.email === 'admin@cabinet.com';

  const routeToModuleMap: Record<string, ModuleKey> = {
    'Dashboard': 'dashboard',
    'AIAssistant': 'ai',
    'Clients': 'clients',
    'Dossiers': 'cases',
    'Procedures': 'procedures',
    'Agenda': 'agenda',
    'Evenements': 'events',
    'Chat': 'chat',
    'Correspondance': 'correspondance',
    'Facturation': 'billing',
    'Avocats': 'avocats',
    'Personnels': 'personnels',
    'Fournisseurs': 'suppliers',
    'GestionUtilisateurs': 'gestion_utilisateurs',
    'GestionCabinet': 'gestion_cabinet',
    'Gestion': 'gestion_cabinet',
    'AuditLogs': 'audit'
  };

  return items.filter(item => {
    if (item.name === 'All') return isSuperAdmin;
    if (item.isGroup && item.subItems) {
      const allowedSubs = item.subItems.filter(sub => {
        const mod = routeToModuleMap[sub.name];
        return mod ? hasPermission(user, mod) : true;
      });
      return allowedSubs.length > 0;
    }

    const requiredModule = routeToModuleMap[item.name];
    if (!requiredModule) return true;
    return hasPermission(user, requiredModule);
  });
}
