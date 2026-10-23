import { AppUser, CreateUserPayload, UserRole, PersonnelCategory } from '../types/rbac';
import { DEFAULT_ROLE_PERMISSIONS } from './rbacService';
import { db, createAuthAccountIfPossible } from '../firebase';
import { collection, doc, setDoc, updateDoc, onSnapshot, getDocs, query, where, limit } from 'firebase/firestore';
import { sanitizeForFirestore } from '../lib/firestoreService';
import { auth } from '../firebase';

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
  return { ...user, id: user.id || userDocument.id };
}

export async function syncUsersWithFirestore(onUpdate: (users: AppUser[]) => void): Promise<() => void> {
  const usersRef = collection(db, 'users');
  if (!auth.currentUser) {
    onUpdate([]);
    return () => {};
  }
  const unsub = onSnapshot(usersRef, (snapshot) => {
    const remoteUsers: AppUser[] = [];
    snapshot.forEach(docSnap => {
      const user = docSnap.data() as AppUser;
      remoteUsers.push({ ...user, id: user.id || docSnap.id });
    });
    onUpdate(remoteUsers);
  }, (error) => {
    console.error("Users subscription failed:", error);
    onUpdate([]);
  });

  return unsub;
}

export async function createNewUser(payload: CreateUserPayload): Promise<AppUser> {
  const now = new Date().toISOString();
  const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  const isOfficePersonnel = payload.userType === 'Personnel' && payload.personnelCategory === 'Office';
  const hasAppAccess = payload.hasAppAccess !== undefined ? payload.hasAppAccess : !isOfficePersonnel;
  const rawPassword = (payload.password || payload.tempPassword || '').trim();
  
  let role: UserRole = (payload as any).role || (payload.userType === 'Avocat' ? 'Avocat' : 'Personnel');

  const newUser: AppUser = {
    id: newId,
    email: payload.email.trim().toLowerCase(),
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
  await setDoc(doc(db, 'users', newUser.id), cleanData);

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
  const now = new Date().toISOString();
  const userRef = doc(db, 'users', userId);

  try {
    const finalSet = sanitizeForFirestore({ ...updates, updatedAt: now });

    await setDoc(userRef, finalSet, { merge: true });
  } catch (err) {
    console.error("Failed to update user in Firestore:", err);
    throw err;
  }
}

export async function softDeleteUser(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'users', userId), {
    isDeleted: true,
    status: 'Archivé',
    updatedAt: now
  });
}

export async function restoreUser(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'users', userId), {
    isDeleted: false,
    status: 'Actif',
    updatedAt: now
  });
}
