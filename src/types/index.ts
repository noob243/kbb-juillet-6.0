
export interface Client {
  id: string | number;
  name: string;
  denomination?: string;
  contact: string;
  cases: number;
  email?: string;
  phone?: string;
  secteur?: string;
  siege?: string;
  sieges?: string[];
  dirigeant?: string;
  ref1_nom?: string;
  ref1_phone?: string;
  ref1_email?: string;
  ref2_nom?: string;
  ref2_phone?: string;
  ref2_email?: string;
  typeFacturation?: string;
  logoUrl?: string;
  piecesJointes?: Array<{ name: string; size: string; content?: string }>;
}

export interface CaseProcedure {
  id: string;
  name: string;
  instance?: string;
  objet?: string;
  dateDebut?: string;
  dateFin?: string;
  status?: string;
  linkedCases?: string[]; // dossier IDs linked to this procedure
}

export interface Case {
  id: string;
  name: string;
  client: string;
  status: 'Nouveau' | 'En cours' | 'En attente' | 'Clôturé';
  nextHearing: string | null;
  procedure?: string;
  procedureInstance?: string;
  procedureObjet?: string;
  procedureDateDebut?: string;
  procedureDateFin?: string;
  procedureStatus?: string;
  notes?: string;
  procedures?: CaseProcedure[];
  avocatTitulaire?: string;
  avocatsSurDossier?: string;
  tags?: string[];
  adversaire?: string;
  adversaires?: string[];
  piecesJointes?: Array<{ name: string; size: string; content?: string }>;
}

export interface EventReport {
  id: string;
  title: string;
  content: string;
  dateCreated: string;
  author?: string;
  files?: Array<{ name: string; size: string; content?: string }>;
}

export interface Event {
  id: string;
  name: string;
  type: 'Atelier' | 'Conférence' | 'Colloque' | 'Séminaire' | 'Autre';
  date: string;
  dates?: string[];
  lieu: string;
  partenaires?: string;
  coOrganisateur?: string;
  publicCible?: string;
  membresKBB?: string;
  membresExternes?: string;
  budgetPrevisionnel?: string;
  budgetRealise?: string;
  fraisParticipation?: number;
  autresRecettes?: number;
  recettesTotal?: number;
  financement?: string;
  financements?: Array<{ label: string; amount: string }>;
  sponsors?: string;
  photoProfil?: string;
  piecesJointes?: Array<{ name: string; size: string; content?: string }>;
  reports?: EventReport[];
  evolutionFinancement?: Array<{ designation: string; attendu: number; realise: number }>;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  iban?: string;
  swift?: string;
}

export interface Avocat {
  id: string;
  fullName: string;
  photo: File | null;
  photoUrl?: string;
  firstOathDate: string;
  secondOathDate: string;
  onaNumber: string;
  cabinetStatus: 'Senior of counsel' | 'Senior' | 'Associé' | 'Junior';
  serviceStartDate: string;
  serviceStatus: 'Actif' | 'Omis' | 'Mise en disponibilité';
  cabinetRole: string;
  phone: string;
  emails: string[];
  disciplinaryMeasures: string;
  mainBar?: 'Kinshasa-Gombe' | 'Kinshasa-Matete' | 'Lualaba' | 'Haut Katanga' | 'Kwilu';
  secondaryBar?: string;
  barreaux?: string[];
  maritalStatus?: 'Célibataire' | 'Marié(e)' | 'Divorcé(e)' | 'Veuf(ve)';
  physicalAddress?: string;
  hasChildren?: 'Oui' | 'Non';
  childrenCount?: number;
  bankAccounts?: BankAccount[];
  piecesJointes?: Array<{ name: string; size: string; content?: string }>;
  permissions?: ModuleKey[];
}

export interface Task {
  id: number;
  name: string;
  caseId: string;
  lawyer: string;
  dueDate: string;
  status: 'Effectué' | 'Non effectué' | 'Effectué à moitié';
  notes?: string;
  procedureLinked?: string;
  procedureLinkedIds?: string[];
  startDate?: string;
  endDate?: string;
  associatedLawyers?: string[];
  rapport?: string;
  reminderEnabled?: boolean;
  reminderDate?: string;
  reminderTime?: string;
  reminderSound?: 'digital' | 'bell' | 'marimba' | 'classic';
  reminderTriggered?: boolean;
  attachments?: Array<{ name: string; size: string; content?: string }>;
}

export interface Invoice {
  id: string;
  caseId: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'Réglée' | 'Non réglée' | 'En cours';
  etiquette?: string;
  createdBy?: string;
  piecesJointes?: Array<{ name: string; size: string; content?: string }>;
}

export * from './rbac';

export interface Personnel {
  id: string;
  fullName: string;
  role: string;
  category?: 'Administratif' | 'Office';
  hasAppAccess?: boolean;
  isDeleted?: boolean;
  email: string;
  phone: string;
  serviceStartDate: string;
  serviceStatus: 'Actif' | 'Inactif' | 'Mise en disponibilité';
  salary: number;
  maritalStatus: 'Célibataire' | 'Marié(e)' | 'Divorcé(e)' | 'Veuf(ve)';
  hasChildren: 'Oui' | 'Non';
  childrenCount?: number;
  address: string;
  photo?: string;
  disciplinaryMeasure?: string;
  disciplinaryStatus?: string;
  bankAccounts?: BankAccount[];
  piecesJointes?: Array<{ name: string; size: string; content?: string }>;
  permissions?: ModuleKey[];
}

export interface Referent {
  nom: string;
  phone: string;
  email: string;
}

export interface Fournisseur {
  id: string;
  nomComplet: string;
  logo?: string;
  naturePrestation: 'Bien' | 'Services' | 'Baie locative';
  designationPrestation: string;
  typeFacturation: 'Périodique' | 'Ponctuelle';
  periode?: 'mensuel' | 'trimestriel' | 'Annuel';
  montant: number;
  adressePhysique: string;
  adresseMail: string;
  dirigeantPrincipal: string;
  referents: Referent[];
  piecesJointes?: Array<{ name: string; size: string; content?: string }>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  actionType: 'Ajout' | 'Modification' | 'Suppression' | 'Connexion' | 'Autre';
  module: string;
  description: string;
  details?: any;
}

export interface Correspondance {
  id: string;
  date: string;
  type?: 'Lettre' | 'E-mail' | 'Mise en demeure' | 'Autre';
  recipientName: string;
  destinataire?: string;
  recipientEmail?: string;
  subject: string;
  content: string;
  status: 'Brouillon' | 'Envoyé' | 'Reçu';
  author: string;
  caseId?: string;
  procedureId?: string;
  avocatSignataireId?: string;
  dateEmission?: string;
  dateReception?: string;
  piecesJointes?: Array<{ name: string; size: string; content?: string }>;
}


