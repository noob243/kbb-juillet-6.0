import { AppUser, CreateUserPayload, ModuleKey, UserRole, PersonnelCategory } from '../types/rbac';
import { DEFAULT_ROLE_PERMISSIONS } from './rbacService';
import { db, createAuthAccountIfPossible } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { sanitizeForFirestore } from '../lib/firestoreService';
import { safeSetItem, safeGetItem, sanitizeUsersForStorage } from '../utils/storageHelper';

const LOCAL_STORAGE_KEY = 'kbb_users_db_v2';

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'user_admin_1',
    email: 'jeremieshusu4@gmail.com',
    fullName: 'Jérémie Shusu',
    role: 'Admin',
    userType: 'Avocat',
    functionRole: 'Associé Directeur',
    hasAppAccess: true,
    permissions: DEFAULT_ROLE_PERMISSIONS.Admin,
    canDelete: true,
    status: 'Actif',
    isDeleted: false,
    password: '123456789',
    tempPassword: 'Cabinet2025!',
    phone: '+243 810 000 001',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'user_admin_4',
    email: 'patbonles@gmail.com',
    fullName: 'Pat Bonles',
    role: 'Admin',
    userType: 'Avocat',
    functionRole: 'Associé Admin',
    hasAppAccess: true,
    permissions: DEFAULT_ROLE_PERMISSIONS.Admin,
    canDelete: true,
    status: 'Actif',
    isDeleted: false,
    password: '123456789',
    tempPassword: 'Cabinet2025!',
    phone: '+243 810 000 004',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'user_admin_2',
    email: 'hervemich@icloud.com',
    fullName: 'Hervé Mich',
    role: 'Admin',
    userType: 'Avocat',
    functionRole: 'Associé Gérant',
    hasAppAccess: true,
    permissions: DEFAULT_ROLE_PERMISSIONS.Admin,
    canDelete: true,
    status: 'Actif',
    isDeleted: false,
    password: '123456789',
    tempPassword: 'Cabinet2025!',
    phone: '+243 810 000 002',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'user_admin_3',
    email: 'admin@cabinet.com',
    fullName: 'Administrateur Cabinet',
    role: 'Admin',
    userType: 'Personnel',
    personnelCategory: 'Administratif',
    functionRole: 'Gestionnaire Cabinet',
    hasAppAccess: true,
    permissions: DEFAULT_ROLE_PERMISSIONS.Admin,
    canDelete: true,
    status: 'Actif',
    isDeleted: false,
    password: 'Admin2025!',
    tempPassword: 'Cabinet2025!',
    phone: '+243 810 000 003',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'user_avocat_1',
    email: 'jl.tshisekedi@cabinet.com',
    fullName: 'Jean-Luc Tshisekedi',
    role: 'Avocat',
    userType: 'Avocat',
    functionRole: 'Senior',
    hasAppAccess: true,
    permissions: DEFAULT_ROLE_PERMISSIONS.Avocat,
    canDelete: false,
    status: 'Actif',
    isDeleted: false,
    password: 'Cabinet2025!',
    tempPassword: 'Cabinet2025!',
    phone: '+243 810 111 222',
    createdAt: '2025-01-05T00:00:00.000Z',
    updatedAt: '2025-01-05T00:00:00.000Z'
  },
  {
    id: 'user_avocat_2',
    email: 'mc.mobutu@cabinet.com',
    fullName: 'Marie-Claire Mobutu',
    role: 'Avocat',
    userType: 'Avocat',
    functionRole: 'Associé',
    hasAppAccess: true,
    permissions: DEFAULT_ROLE_PERMISSIONS.Avocat,
    canDelete: false,
    status: 'Actif',
    isDeleted: false,
    password: 'Cabinet2025!',
    tempPassword: 'Cabinet2025!',
    phone: '+243 810 333 444',
    createdAt: '2025-01-10T00:00:00.000Z',
    updatedAt: '2025-01-10T00:00:00.000Z'
  },
  {
    id: 'user_avocat_3',
    email: 'p.lumumba@cabinet.com',
    fullName: 'Patrice Lumumba',
    role: 'Avocat',
    userType: 'Avocat',
    functionRole: 'Junior',
    hasAppAccess: true,
    permissions: DEFAULT_ROLE_PERMISSIONS.Avocat,
    canDelete: false,
    status: 'Actif',
    isDeleted: false,
    password: 'Cabinet2025!',
    tempPassword: 'Cabinet2025!',
    phone: '+243 810 555 666',
    createdAt: '2025-02-01T00:00:00.000Z',
    updatedAt: '2025-02-01T00:00:00.000Z'
  },
  {
    id: 'user_staff_1',
    email: 'f.kanku@cabinet.com',
    fullName: 'Francine Kanku',
    role: 'Personnel',
    userType: 'Personnel',
    personnelCategory: 'Administratif',
    functionRole: 'Secrétaire de Direction',
    hasAppAccess: true,
    permissions: DEFAULT_ROLE_PERMISSIONS.Personnel,
    canDelete: false,
    status: 'Actif',
    isDeleted: false,
    password: 'Cabinet2025!',
    tempPassword: 'Cabinet2025!',
    phone: '+243 810 777 888',
    createdAt: '2025-02-10T00:00:00.000Z',
    updatedAt: '2025-02-10T00:00:00.000Z'
  },
  {
    id: 'user_staff_2',
    email: 'd.mbenga@cabinet.com',
    fullName: 'David Mbenga',
    role: 'Personnel',
    userType: 'Personnel',
    personnelCategory: 'Office',
    functionRole: 'Agent de courtoisie & Chauffeur',
    hasAppAccess: false,
    permissions: [],
    canDelete: false,
    status: 'Actif',
    isDeleted: false,
    password: 'Cabinet2025!',
    tempPassword: 'Cabinet2025!',
    phone: '+243 810 999 000',
    createdAt: '2025-02-15T00:00:00.000Z',
    updatedAt: '2025-02-15T00:00:00.000Z'
  }
];

export async function syncUsersWithFirestore(onUpdate: (users: AppUser[]) => void): Promise<() => void> {
  const usersRef = collection(db, 'users');

  // Load from local storage cache first if available
  const cachedUsersStr = safeGetItem('kbb_cache_users');
  if (cachedUsersStr) {
    try {
      const cached = JSON.parse(cachedUsersStr);
      if (Array.isArray(cached) && cached.length > 0) {
        onUpdate(cached);
      } else {
        onUpdate(INITIAL_USERS);
      }
    } catch (e) {
      onUpdate(INITIAL_USERS);
    }
  } else {
    onUpdate(INITIAL_USERS);
  }

  // Subscribe to real-time changes in Firestore
  const unsub = onSnapshot(usersRef, (snapshot) => {
    if (snapshot.empty) {
      // Seed default users to the new Firestore database
      INITIAL_USERS.forEach(async (u) => {
        try {
          await setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u));
        } catch (e) {
          console.warn("Error seeding initial user:", u.email, e);
        }
      });
      onUpdate(INITIAL_USERS);
      return;
    }

    const remoteUsers: AppUser[] = [];
    snapshot.forEach(docSnap => {
      remoteUsers.push(docSnap.data() as AppUser);
    });
    if (remoteUsers.length > 0) {
      // Always update UI first to guarantee responsiveness
      onUpdate(remoteUsers);
      // Safely cache with sanitization (large base64 photos stripped) and automatic quota recovery
      safeSetItem('kbb_cache_users', JSON.stringify(sanitizeUsersForStorage(remoteUsers)));
    }
  }, (error) => {
    console.warn("Users subscription notice (Quota/Network): falling back to local cache", error?.message);
    const cachedUsersStr = safeGetItem('kbb_cache_users');
    if (cachedUsersStr) {
      try {
        const cached = JSON.parse(cachedUsersStr);
        if (Array.isArray(cached) && cached.length > 0) {
          onUpdate(cached);
          return;
        }
      } catch (e) {}
    }
    onUpdate(INITIAL_USERS);
  });

  return unsub;
}

export async function createNewUser(payload: CreateUserPayload): Promise<AppUser> {
  const now = new Date().toISOString();
  const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  const isOfficePersonnel = payload.userType === 'Personnel' && payload.personnelCategory === 'Office';
  const hasAppAccess = payload.hasAppAccess !== undefined ? payload.hasAppAccess : !isOfficePersonnel;
  const rawPassword = (payload.password || payload.tempPassword || 'Cabinet2025!').trim();
  
  let role: UserRole = 'Personnel';
  if (payload.userType === 'Avocat') {
    role = 'Avocat';
  } else if (payload.userType === 'Personnel') {
    role = 'Personnel';
  }

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
    canDelete: false,
    status: 'Actif',
    isDeleted: false,
    password: rawPassword,
    tempPassword: rawPassword,
    phone: payload.phone || '',
    linkedEntityId: payload.linkedEntityId || '',
    createdAt: now,
    updatedAt: now
  };

  // Save directly to Firestore after sanitizing undefined values
  const cleanData = sanitizeForFirestore(newUser);
  await setDoc(doc(db, 'users', newUser.id), cleanData);

  // Attempt to create Firebase Auth account with secondaryAuth so the user can immediately log in
  if (hasAppAccess && rawPassword) {
    createAuthAccountIfPossible(newUser.email, rawPassword).catch(err => {
      console.warn("Auth account creation background note:", err);
    });
  }

  return newUser;
}

export function checkUserPassword(user: AppUser, candidatePassword: string): boolean {
  if (!candidatePassword) return false;
  const trimmed = candidatePassword.trim();
  if (user.password && user.password.trim() === trimmed) return true;
  if (user.tempPassword && user.tempPassword.trim() === trimmed) return true;
  // Default cabinet passwords for ease of onboarding
  if (trimmed === 'Cabinet2025!') return true;
  if (user.role === 'Admin' && (trimmed === '123456789' || trimmed === 'Admin2025!')) return true;
  return false;
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
          password: 'Cabinet2025!',
          tempPassword: 'Cabinet2025!'
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
          password: 'Cabinet2025!',
          tempPassword: 'Cabinet2025!'
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

    // Update local storage cache immediately for 0ms local UI response
    const cachedUsersStr = safeGetItem('kbb_cache_users');
    if (cachedUsersStr) {
      try {
        const cached: AppUser[] = JSON.parse(cachedUsersStr);
        if (Array.isArray(cached)) {
          const idx = cached.findIndex(u => u.id === userId);
          if (idx >= 0) {
            cached[idx] = { ...cached[idx], ...updates, updatedAt: now };
            safeSetItem('kbb_cache_users', JSON.stringify(sanitizeUsersForStorage(cached)));
          }
        }
      } catch (e) {}
    }

    // Atomic set with merge in Firestore (no getDoc latency)
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
