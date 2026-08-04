import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import firebaseConfigJson from '../../firebase-applet-config.json';

export interface InitCollectionsResult {
  success: boolean;
  initializedCount: number;
  collections: string[];
  message: string;
}

export async function initializeAllFirestoreCollections(): Promise<InitCollectionsResult> {
  const initializedCollections: string[] = [];
  let count = 0;

  try {
    // 1. Users collection - Default administrative user accounts
    const defaultUsers = [
      {
        id: 'user_admin_1',
        fullName: 'Jérémie Shusu',
        name: 'Jérémie Shusu',
        email: 'jeremieshusu4@gmail.com',
        role: 'Admin',
        title: 'Directeur Associé KBB',
        cabinetRole: 'Directeur Associé',
        status: 'Actif',
        isActive: true,
        hasAppAccess: true,
        isDeleted: false,
        isOnline: false,
        permissions: ['dashboard', 'ai', 'clients', 'cases', 'procedures', 'events', 'agenda', 'chat', 'correspondance', 'invoices', 'avocats', 'personnel', 'fournisseurs', 'gestion', 'audit'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_admin_4',
        fullName: 'Pat Bonles',
        name: 'Pat Bonles',
        email: 'patbonles@gmail.com',
        role: 'Admin',
        title: 'Avocat Associé Admin',
        cabinetRole: 'Avocat Associé',
        status: 'Actif',
        isActive: true,
        hasAppAccess: true,
        isDeleted: false,
        isOnline: false,
        permissions: ['dashboard', 'ai', 'clients', 'cases', 'procedures', 'events', 'agenda', 'chat', 'correspondance', 'invoices', 'avocats', 'personnel', 'fournisseurs', 'gestion', 'audit'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_admin_2',
        fullName: 'Hervé Mich',
        name: 'Hervé Mich',
        email: 'hervemich@icloud.com',
        role: 'Admin',
        title: 'Avocat Associé',
        cabinetRole: 'Avocat Associé',
        status: 'Actif',
        isActive: true,
        hasAppAccess: true,
        isDeleted: false,
        isOnline: false,
        permissions: ['dashboard', 'ai', 'clients', 'cases', 'procedures', 'events', 'agenda', 'chat', 'correspondance', 'invoices', 'avocats', 'personnel', 'fournisseurs', 'gestion', 'audit'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_admin_3',
        fullName: 'Administrateur Cabinet',
        name: 'Administrateur Cabinet',
        email: 'admin@cabinet.com',
        role: 'Admin',
        title: 'Directeur Général',
        cabinetRole: 'Direction Générale',
        status: 'Actif',
        isActive: true,
        hasAppAccess: true,
        isDeleted: false,
        isOnline: false,
        permissions: ['dashboard', 'ai', 'clients', 'cases', 'procedures', 'events', 'agenda', 'chat', 'correspondance', 'invoices', 'avocats', 'personnel', 'fournisseurs', 'gestion', 'audit'],
        createdAt: new Date().toISOString()
      }
    ];

    for (const u of defaultUsers) {
      await setDoc(doc(db, 'users', u.id), u, { merge: true });
      count++;
    }
    initializedCollections.push('users');

    // 2. Clients collection (Real data mode - initialized empty)
    initializedCollections.push('clients');

    // 3. Cases collection (Real data mode - initialized empty)
    initializedCollections.push('cases');

    // 4. Events collection (Real data mode - initialized empty)
    initializedCollections.push('events');

    // 5. Tasks collection (Real data mode - initialized empty)
    initializedCollections.push('tasks');

    // 6. Invoices collection (Real data mode - initialized empty)
    initializedCollections.push('invoices');

    // 7. Avocats collection (Real data mode - initialized empty)
    initializedCollections.push('avocats');

    // 8. Personnels collection (Real data mode - initialized empty)
    initializedCollections.push('personnels');

    // 9. Fournisseurs collection (Real data mode - initialized empty)
    initializedCollections.push('fournisseurs');

    // 10. AuditLogs collection
    const defaultLog = {
      id: 'log_init_kbb',
      actionType: 'Ajout',
      module: 'Base de Données',
      description: `Initialisation et synchronisation complète de la base de données`,
      timestamp: new Date().toISOString(),
      userName: 'Jérémie Shusu',
      userEmail: 'jeremieshusu4@gmail.com'
    };
    await setDoc(doc(db, 'auditLogs', defaultLog.id), defaultLog, { merge: true });
    count++;
    initializedCollections.push('auditLogs');

    // 11. Correspondances collection
    initializedCollections.push('correspondances');

    // 12. Presences collection
    const defaultPres = {
      id: 'pres_today',
      date: new Date().toISOString().split('T')[0],
      totalAgents: 0,
      presents: 0,
      absents: 0,
      retards: 0,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'presences', defaultPres.id), defaultPres, { merge: true });
    count++;
    initializedCollections.push('presences');

    // 13. Cabinet_info collection
    const defaultCabinet = {
      id: 'cabinet_default',
      name: 'Cabinet d Avocats KBB & Associés SARL',
      devise: 'Rigueur - Excellence - Discrétion',
      barreauPrincipal: 'Barreau du Haut-Katanga',
      adresse: 'Avenue Kasavubu N 45, Commune de Lubumbashi, Haut-Katanga, RDC',
      email: 'contact@kbb-cabinet.cd',
      phone: '+243 810 000 000',
      siteweb: 'https://kbb-cabinet.cd',
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'cabinet_info', defaultCabinet.id), defaultCabinet, { merge: true });
    count++;
    initializedCollections.push('cabinet_info');

    // 14. System_settings collection
    const defaultSettings = {
      id: 'settings_default',
      databaseId: firebaseConfigJson.firestoreDatabaseId || firebaseConfigJson.projectId,
      projectId: firebaseConfigJson.projectId,
      realtimeEnabled: true,
      currency: 'USD',
      autoBackup: true,
      lastSyncedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'system_settings', defaultSettings.id), defaultSettings, { merge: true });
    count++;
    initializedCollections.push('system_settings');

    return {
      success: true,
      initializedCount: count,
      collections: [
        'users', 'clients', 'cases', 'events', 'tasks', 
        'invoices', 'avocats', 'personnels', 'fournisseurs', 
        'auditLogs', 'presences', 'correspondances', 'cabinet_info', 'system_settings'
      ],
      message: `Initialisation et synchronisation réussie de toutes les 14 collections dans la base de données !`
    };
  } catch (err: any) {
    console.error('Error initializing Firestore collections:', err);
    return {
      success: false,
      initializedCount: count,
      collections: [],
      message: `Erreur lors de la synchronisation : ${err?.message || String(err)}`
    };
  }
}

