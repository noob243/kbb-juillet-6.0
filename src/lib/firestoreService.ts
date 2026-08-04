import { 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../firebase.ts';
import { AuditLog } from '../types';


export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Secure Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to strip non-serializable properties (like File instances, undefined values) before sending to Firestore
export function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof File) return null; // File instances are not serializable in Firestore JSON
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined) continue;
    if (val instanceof File) continue;
    clean[key] = sanitizeForFirestore(val);
  }
  return clean;
}

export function cleanAndDefaultRecord(collectionName: string, item: any): any {
  if (!item || typeof item !== 'object') return item;
  const cleaned = { ...item };
  
  if (collectionName === 'clients') {
    cleaned.name = cleaned.name || 'Sans nom';
    cleaned.contact = cleaned.contact || 'Aucun contact';
  } else if (collectionName === 'cases') {
    cleaned.name = cleaned.name || 'Sans titre';
    cleaned.client = cleaned.client || 'Client inconnu';
    cleaned.status = cleaned.status || 'Nouveau';
    cleaned.procedures = Array.isArray(cleaned.procedures) ? cleaned.procedures : [];
  } else if (collectionName === 'events') {
    cleaned.name = cleaned.name || 'Sans nom';
    cleaned.type = cleaned.type || 'Autre';
    cleaned.date = cleaned.date || '';
    cleaned.lieu = cleaned.lieu || '';
  } else if (collectionName === 'avocats') {
    cleaned.fullName = cleaned.fullName || 'Avocat sans nom';
    cleaned.firstOathDate = cleaned.firstOathDate || '';
    cleaned.onaNumber = cleaned.onaNumber || '';
    cleaned.cabinetStatus = cleaned.cabinetStatus || 'Junior';
    cleaned.serviceStatus = cleaned.serviceStatus || 'Actif';
    cleaned.phone = cleaned.phone || '';
  } else if (collectionName === 'tasks') {
    cleaned.name = cleaned.name || 'Tâche sans nom';
    cleaned.caseId = cleaned.caseId || '';
    cleaned.lawyer = cleaned.lawyer || '';
    cleaned.dueDate = cleaned.dueDate || '';
    cleaned.status = cleaned.status || 'Non effectué';
  } else if (collectionName === 'invoices') {
    cleaned.caseId = cleaned.caseId || '';
    cleaned.dueDate = cleaned.dueDate || '';
    cleaned.totalAmount = cleaned.totalAmount !== undefined && cleaned.totalAmount !== null ? Number(cleaned.totalAmount) : 0;
    cleaned.paidAmount = cleaned.paidAmount !== undefined && cleaned.paidAmount !== null ? Number(cleaned.paidAmount) : 0;
    cleaned.status = cleaned.status || 'Non réglée';
  } else if (collectionName === 'personnels') {
    cleaned.fullName = cleaned.fullName || 'Personnel sans nom';
    cleaned.role = cleaned.role || 'Personnel';
    cleaned.email = cleaned.email || '';
    cleaned.phone = cleaned.phone || '';
    cleaned.serviceStartDate = cleaned.serviceStartDate || '';
    cleaned.serviceStatus = cleaned.serviceStatus || 'Actif';
    cleaned.salary = cleaned.salary !== undefined && cleaned.salary !== null ? Number(cleaned.salary) : 0;
  } else if (collectionName === 'fournisseurs') {
    cleaned.nomComplet = cleaned.nomComplet || 'Sans nom';
    cleaned.naturePrestation = cleaned.naturePrestation || 'Services';
    cleaned.typeFacturation = cleaned.typeFacturation || 'Ponctuelle';
    cleaned.montant = cleaned.montant !== undefined && cleaned.montant !== null ? Number(cleaned.montant) : 0;
  }
  
  return cleaned;
}

// Low-level write wrapper
export async function dbCreateDoc<T extends { id: string | number }>(collectionName: string, id: string | number, data: Omit<T, 'id'>) {
  const path = `${collectionName}/${id}`;
  try {
    const docRef = doc(db, collectionName, String(id));
    const defaulted = cleanAndDefaultRecord(collectionName, { ...data, id });
    const sanitized = sanitizeForFirestore(defaulted);
    await setDoc(docRef, sanitized);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Low-level update wrapper
export async function dbUpdateDoc<T extends { id: string | number }>(collectionName: string, id: string | number, data: Partial<T>) {
  const path = `${collectionName}/${id}`;
  try {
    const docRef = doc(db, collectionName, String(id));
    // When updating, we don't necessarily have all fields, but we should sanitize it.
    const sanitized = sanitizeForFirestore(data);
    await updateDoc(docRef, sanitized);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Low-level delete wrapper
export async function dbDeleteDoc(collectionName: string, id: string | number) {
  const path = `${collectionName}/${id}`;
  try {
    const docRef = doc(db, collectionName, String(id));
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Helper to seed database if empty
export async function seedCollectionIfEmpty<T extends { id: string | number }>(collectionName: string, initialData: T[]) {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      console.log(`Seeding Firestore collection: ${collectionName}`);
      for (const item of initialData) {
        const id = item.id;
        const defaulted = cleanAndDefaultRecord(collectionName, item);
        const sanitized = sanitizeForFirestore(defaulted);
        await setDoc(doc(db, collectionName, String(id)), sanitized);
      }
    }
  } catch (error) {
    console.error(`Failed to seed collection ${collectionName}:`, error);
  }
}

// Bi-directional safety sync: pushes local entries that do not exist in Firestore yet
export async function syncLocalCollection<T extends { id: string | number }>(
  collectionName: string,
  localItems: T[]
): Promise<void> {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    
    // Case 1: Firestore is empty - Seed with current local state (contains any custom edits)
    if (snap.empty) {
      console.log(`Firestore ${collectionName} is empty. Seeding with current local state of size:`, localItems.length);
      for (const item of localItems) {
        try {
          const docRef = doc(db, collectionName, String(item.id));
          const defaulted = cleanAndDefaultRecord(collectionName, item);
          const sanitized = sanitizeForFirestore(defaulted);
          await setDoc(docRef, sanitized);
        } catch (itemErr) {
          console.error(`Failed to seed record with ID ${item.id} in ${collectionName}:`, itemErr);
        }
      }
      return;
    }

    // Case 2: Firestore has entries - Detect and push any items ONLY existing locally (e.g. offline inserts)
    const cloudIds = new Set(snap.docs.map(d => String(d.id)));
    let uploadedCount = 0;
    
    for (const item of localItems) {
      if (!cloudIds.has(String(item.id))) {
        try {
          console.log(`Uploading missing offline/local insert to Firestore for ${collectionName}: ID ${item.id}`);
          const docRef = doc(db, collectionName, String(item.id));
          const defaulted = cleanAndDefaultRecord(collectionName, item);
          const sanitized = sanitizeForFirestore(defaulted);
          await setDoc(docRef, sanitized);
          uploadedCount++;
        } catch (itemErr) {
          console.error(`Failed to upload record with ID ${item.id} to ${collectionName}:`, itemErr);
        }
      }
    }
    
    if (uploadedCount > 0) {
      console.log(`Uploaded ${uploadedCount} missing local records to Cloud Firestore for ${collectionName}.`);
    }
  } catch (error) {
    console.error(`Failed to sync local collection ${collectionName} with Firestore:`, error);
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/_sync`);
  }
}

export async function dbCreateAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog | null> {
  const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const timestamp = new Date().toISOString();
  const fullLog: AuditLog = {
    ...log,
    id,
    timestamp
  };
  try {
    const docRef = doc(db, 'auditLogs', id);
    const sanitized = sanitizeForFirestore(fullLog);
    await setDoc(docRef, sanitized);
    return fullLog;
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
}

