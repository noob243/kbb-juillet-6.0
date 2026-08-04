import { ModuleKey, ModulePermission, UserRole, AppUser } from '../types/rbac';

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
  }
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, ModuleKey[]> = {
  Admin: ALL_MODULE_PERMISSIONS.map(m => m.key),
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
