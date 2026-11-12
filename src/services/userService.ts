import { AppUser, CreateUserPayload, UserRole, PersonnelCategory } from '../types/rbac';
import { DEFAULT_ROLE_PERMISSIONS } from './rbacService';
import { db, createAuthAccountIfPossible } from '../firebase';
import { collection, doc, updateDoc, getDoc, onSnapshot, getDocs, query, where, limit, runTransaction, writeBatch, orderBy, documentId, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { sanitizeForFirestore } from '../lib/firestoreService';
import { auth, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

export function getUserDocumentId(email: string): string {
  let hash = 14695981039346656037n;
  for (const byte of new TextEncoder().encode(email)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 1099511628211n);
  }
  return `user_${hash.toString(16).padStart(16, '0')}`;
}

export function deduplicateAppUsers(users: AppUser[]): AppUser[] {
  const usersByEmail = new Map<string, AppUser>();
  const usersWithoutEmail: AppUser[] = [];

  for (const user of users) {
    const email = (user.email || '').trim().toLowerCase();
    if (!email) {
      if (user.id && user.fullName) {
        usersWithoutEmail.push(user);
      }
      continue;
    }

    const existing = usersByEmail.get(email);
    if (!existing) {
      usersByEmail.set(email, user);
      continue;
    }

    // 1. One with authUid (linked to real Firebase Auth) takes precedence
    const userHasAuth = Boolean(user.authUid);
    const existingHasAuth = Boolean(existing.authUid);
    if (userHasAuth && !existingHasAuth) {
      usersByEmail.set(email, user);
      continue;
    }
    if (!userHasAuth && existingHasAuth) {
      continue;
    }

    // 2. Active account over deleted / archived
    const userActive = user.status === 'Actif' && !user.isDeleted;
    const existingActive = existing.status === 'Actif' && !existing.isDeleted;
    if (userActive && !existingActive) {
      usersByEmail.set(email, user);
      continue;
    }
    if (!userActive && existingActive) {
      continue;
    }

    // 3. Admin role over non-admin
    if (user.role === 'Admin' && existing.role !== 'Admin') {
      usersByEmail.set(email, user);
      continue;
    }
    if (user.role !== 'Admin' && existing.role === 'Admin') {
      continue;
    }

    // 4. Deterministic ID format (user_${hash}) over legacy random ID
    const userIsDeterministic = user.id === getUserDocumentId(email);
    const existingIsDeterministic = existing.id === getUserDocumentId(email);
    if (userIsDeterministic && !existingIsDeterministic) {
      usersByEmail.set(email, user);
      continue;
    }
    if (!userIsDeterministic && existingIsDeterministic) {
      continue;
    }

    // 5. Most recent updatedAt or lastActiveAt
    const userTime = user.updatedAt || user.lastActiveAt || user.createdAt || '';
    const existingTime = existing.updatedAt || existing.lastActiveAt || existing.createdAt || '';
    if (userTime > existingTime) {
      usersByEmail.set(email, user);
    }
  }

  return [...Array.from(usersByEmail.values()), ...usersWithoutEmail];
}

export async function getAuthenticatedUserByEmail(email: string): Promise<AppUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== cleanEmail) {
    throw new Error('Une session Firebase correspondante est requise.');
  }
  const userSnapshot = await getDocs(query(
    collection(db, 'users'),
    where('authUid', '==', auth.currentUser.uid),
    limit(1)
  ));
  const userDocument = userSnapshot.docs[0];
  if (!userDocument) return null;
  const user = userDocument.data() as AppUser;
  return { ...user, id: userDocument.id };
}

export async function syncUsersWithFirestore(
  onUpdate: (users: AppUser[], isLoading: boolean) => void,
  onError?: (error: Error) => void
): Promise<() => void> {
  const usersRef = collection(db, 'users');
  if (!auth.currentUser) {
    onUpdate([], false);
    return () => {};
  }
  const usersById = new Map<string, AppUser>();
  const pageSize = 100;
  const syncStartedAt = new Date().toISOString();
  let initialLoadComplete = false;
  let isActive = true;
  const notify = () => {
    if (initialLoadComplete && isActive) {
      onUpdate(deduplicateAppUsers(Array.from(usersById.values())), false);
    }
  };
  const notifyLoading = () => {
    if (isActive) {
      onUpdate(deduplicateAppUsers(Array.from(usersById.values())), true);
    }
  };
  const handleError = (error: Error) => {
    console.error("Users subscription failed:", error);
    if (isActive) onError?.(error);
  };

  const unsubscribeChanges = onSnapshot(
    query(usersRef, where('updatedAt', '>=', syncStartedAt)),
    snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'removed') {
          usersById.delete(change.doc.id);
        } else {
          const user = change.doc.data() as AppUser;
          usersById.set(change.doc.id, { ...user, id: change.doc.id });
        }
      });
      notify();
    },
    handleError
  );

  void (async () => {
    let cursor: QueryDocumentSnapshot<DocumentData> | undefined;
    try {
      while (isActive) {
        const pageQuery = query(
          usersRef,
          orderBy(documentId()),
          ...(cursor ? [startAfter(cursor)] : []),
          limit(pageSize)
        );
        const page = await getDocs(pageQuery);
        page.docs.forEach(docSnap => {
          const user = docSnap.data() as AppUser;
          const current = usersById.get(docSnap.id);
          if (!current || (user.updatedAt || '') >= (current.updatedAt || '')) {
            usersById.set(docSnap.id, { ...user, id: docSnap.id });
          }
        });
        notifyLoading();

        if (page.size < pageSize) break;
        cursor = page.docs[page.docs.length - 1];
      }
      initialLoadComplete = true;
      if (isActive) onUpdate(deduplicateAppUsers(Array.from(usersById.values())), false);
    } catch (error) {
      initialLoadComplete = true;
      if (isActive) onUpdate(deduplicateAppUsers(Array.from(usersById.values())), false);
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return () => {
    isActive = false;
    unsubscribeChanges();
  };
}

export async function createNewUser(payload: CreateUserPayload): Promise<AppUser> {
  const now = new Date().toISOString();
  const email = payload.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Une adresse e-mail valide est requise.');
  }

  const newId = getUserDocumentId(email);
  const usersRef = collection(db, 'users');
  const existingUsers = await getDocs(query(usersRef, where('email', '==', email), limit(1)));
  if (!existingUsers.empty) {
    throw new Error('Un profil utilisateur existe déjà pour cette adresse e-mail.');
  }
  
  const isOfficePersonnel = payload.userType === 'Personnel' && payload.personnelCategory === 'Office';
  const hasAppAccess = payload.hasAppAccess !== undefined ? payload.hasAppAccess : !isOfficePersonnel;
  const rawPassword = (payload.password || payload.tempPassword || '').trim();
  
  let role: UserRole = (payload as any).role || (payload.userType === 'Avocat' ? 'Avocat' : 'Personnel');

  const newUser: AppUser = {
    id: newId,
    email,
    fullName: payload.fullName.trim(),
    role: role,
    userType: payload.userType,
    personnelCategory: payload.userType === 'Personnel' ? (payload.personnelCategory || 'Administratif') : undefined,
    functionRole: payload.functionRole || '',
    hasAppAccess: hasAppAccess,
    permissions: hasAppAccess ? (payload.permissions || []) : [],
    canDelete: (role as string) === 'Admin' || (Array.isArray(payload.permissions) && payload.permissions.includes('can_delete')),
    status: 'Actif',
    isDeleted: false,
    phone: payload.phone || '',
    linkedEntityId: payload.linkedEntityId || '',
    createdAt: now,
    updatedAt: now
  };

  if (hasAppAccess && rawPassword) {
    if (rawPassword.length < 12) {
      throw new Error('Le mot de passe initial doit contenir au moins 12 caractères.');
    }
    const authAccount = await createAuthAccountIfPossible(newUser.email, rawPassword);
    if (!authAccount.success) {
      throw new Error(authAccount.error || 'Impossible de créer le compte d’authentification.');
    }
  }

  const cleanData = sanitizeForFirestore(newUser);
  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', newUser.id);
    const existingUser = await transaction.get(userRef);
    if (existingUser.exists()) {
      const existingEmail = String(existingUser.data().email || '').trim().toLowerCase();
      throw new Error(existingEmail === email
        ? 'Un profil utilisateur existe déjà pour cette adresse e-mail.'
        : 'Identifiant utilisateur en conflit. Contactez un administrateur.');
    }
    transaction.set(userRef, cleanData);
  });

  return newUser;
}

export async function syncAvocatsAndPersonnelsToUsers(
  avocats: Array<{ id: string; fullName: string; emails?: string[]; cabinetRole?: string; phone?: string }>,
  personnels: Array<{ id: string; fullName: string; email?: string; role?: string; category?: string; phone?: string }>,
  currentUsers: AppUser[]
): Promise<void> {
  const existingEmails = new Set(currentUsers.map(u => (u.email || '').trim().toLowerCase()));

  // Sync Avocats
  for (const avocat of avocats) {
    const email = (avocat.emails && avocat.emails[0]) ? avocat.emails[0].trim().toLowerCase() : '';
    if (email && !existingEmails.has(email)) {
      existingEmails.add(email);
      try {
        await createNewUser({
          email,
          fullName: avocat.fullName,
          userType: 'Avocat',
          functionRole: avocat.cabinetRole || 'Avocat Collaborateur',
          phone: avocat.phone || '',
          permissions: DEFAULT_ROLE_PERMISSIONS.Avocat,
          linkedEntityId: avocat.id,
        });
      } catch (e) {
        console.warn("Could not auto-provision avocat user:", email, e);
      }
    }
  }

  // Sync Personnels
  for (const pers of personnels) {
    const email = pers.email ? pers.email.trim().toLowerCase() : '';
    if (email && !existingEmails.has(email)) {
      existingEmails.add(email);
      const isOffice = pers.category === 'Office';
      try {
        await createNewUser({
          email,
          fullName: pers.fullName,
          userType: 'Personnel',
          personnelCategory: (pers.category as PersonnelCategory) || 'Administratif',
          functionRole: pers.role || 'Personnel',
          phone: pers.phone || '',
          hasAppAccess: !isOffice,
          permissions: !isOffice ? DEFAULT_ROLE_PERMISSIONS.Personnel : [],
          linkedEntityId: pers.id,
        });
      } catch (e) {
        console.warn("Could not auto-provision personnel user:", email, e);
      }
    }
  }
}

export async function updateAppUser(userId: string, updates: Partial<AppUser>): Promise<void> {
  try {
    await updateAppUserAndLinkedRecord(userId, updates);
  } catch (err) {
    console.error("Failed to update user in Firestore:", err);
    throw err;
  }
}

export async function updateAppUserAndLinkedRecord(
  userId: string,
  updates: Partial<AppUser>,
  linkedRecord?: {
    collectionName: 'avocats' | 'personnels';
    id: string;
    updates: Record<string, unknown>;
  }
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  if (updates.email !== undefined) {
    const currentUser = await getDoc(userRef);
    if (!currentUser.exists()) throw new Error('Le profil utilisateur est introuvable.');
    const currentData = currentUser.data() as AppUser;
    if ((currentData.authUid || currentData.hasAppAccess !== false)
      && updates.email.trim().toLowerCase() !== (currentData.email || '').trim().toLowerCase()) {
      throw new Error('L’adresse e-mail de connexion ne peut pas être modifiée depuis ce formulaire.');
    }
  }

  const batch = writeBatch(db);
  batch.set(userRef, sanitizeForFirestore({ ...updates, updatedAt: new Date().toISOString() }), { merge: true });
  if (linkedRecord) {
    batch.update(
      doc(db, linkedRecord.collectionName, linkedRecord.id),
      sanitizeForFirestore(linkedRecord.updates)
    );
  }
  await batch.commit();
}

export async function softDeleteUser(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'users', userId), {
    isDeleted: true,
    status: 'Archivé',
    updatedAt: now
  });
}

export async function hardDeleteUser(userId: string): Promise<void> {
  const deleteManagedUser = httpsCallable(functions, 'deleteManagedUser');
  await deleteManagedUser({ userId });
}

export async function restoreUser(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'users', userId), {
    isDeleted: false,
    status: 'Actif',
    updatedAt: now
  });
}
