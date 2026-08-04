import { AppUser, CreateUserPayload, ModuleKey, UserRole, PersonnelCategory } from '../types/rbac';
import { DEFAULT_ROLE_PERMISSIONS } from './rbacService';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { sanitizeForFirestore } from '../lib/firestoreService';

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
    status: 'Actif',
    isDeleted: false,
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
    status: 'Actif',
    isDeleted: false,
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
    status: 'Actif',
    isDeleted: false,
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
    status: 'Actif',
    isDeleted: false,
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
    status: 'Actif',
    isDeleted: false,
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
    status: 'Actif',
    isDeleted: false,
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
    status: 'Actif',
    isDeleted: false,
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
    status: 'Actif',
    isDeleted: false,
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
    status: 'Actif',
    isDeleted: false,
    phone: '+243 810 999 000',
    createdAt: '2025-02-15T00:00:00.000Z',
    updatedAt: '2025-02-15T00:00:00.000Z'
  }
];

export async function syncUsersWithFirestore(onUpdate: (users: AppUser[]) => void): Promise<() => void> {
  const usersRef = collection(db, 'users');

  // Load from local storage cache first if available
  const cachedUsersStr = localStorage.getItem('kbb_cache_users');
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
      localStorage.setItem('kbb_cache_users', JSON.stringify(remoteUsers));
      onUpdate(remoteUsers);
    }
  }, (error) => {
    console.warn("Users subscription notice (Quota/Network): falling back to local cache", error?.message);
    const cachedUsersStr = localStorage.getItem('kbb_cache_users');
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
    status: 'Actif',
    isDeleted: false,
    phone: payload.phone || '',
    linkedEntityId: payload.linkedEntityId || '',
    createdAt: now,
    updatedAt: now
  };

  // Save directly to Firestore after sanitizing undefined values
  const cleanData = sanitizeForFirestore(newUser);
  await setDoc(doc(db, 'users', newUser.id), cleanData);
  return newUser;
}

export async function updateAppUser(userId: string, updates: Partial<AppUser>): Promise<void> {
  const now = new Date().toISOString();
  const userRef = doc(db, 'users', userId);

  try {
    const finalSet = sanitizeForFirestore({ ...updates, updatedAt: now });

    // Update local storage cache immediately for 0ms local UI response
    const cachedUsersStr = localStorage.getItem('kbb_cache_users');
    if (cachedUsersStr) {
      try {
        const cached: AppUser[] = JSON.parse(cachedUsersStr);
        if (Array.isArray(cached)) {
          const idx = cached.findIndex(u => u.id === userId);
          if (idx >= 0) {
            cached[idx] = { ...cached[idx], ...updates, updatedAt: now };
            localStorage.setItem('kbb_cache_users', JSON.stringify(cached));
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
