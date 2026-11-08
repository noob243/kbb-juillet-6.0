const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const app = admin.initializeApp();

const FIRESTORE_DATABASE_ID = 'ai-studio-kbbappjuin-5d1bdf63-f454-4325-bd12-e80af9246ebc';
const auth = getAuth(app);
const PERMISSIONS = [
  'dashboard', 'ai', 'clients', 'cases', 'procedures', 'agenda', 'events',
  'chat', 'correspondance', 'billing', 'avocats', 'personnels', 'suppliers',
  'gestion_utilisateurs', 'gestion_cabinet', 'audit', 'can_delete', 'presentation'
];

async function bootstrap() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('Set BOOTSTRAP_ADMIN_EMAIL to the reviewed administrator account.');

  const database = getFirestore(app, FIRESTORE_DATABASE_ID);
  const profiles = await database.collection('users').where('email', '==', email).limit(2).get();
  if (profiles.size !== 1) {
    throw new Error('Expected exactly one existing user profile for the selected administrator.');
  }

  const profileDoc = profiles.docs[0];
  const profile = profileDoc.data();
  if (profile.role !== 'Admin' || profile.status !== 'Actif'
    || profile.isDeleted === true || profile.hasAppAccess === false) {
    throw new Error('The selected profile is not an active administrator with app access.');
  }

  const authUser = await auth.getUserByEmail(email);
  if (!authUser.emailVerified) {
    throw new Error('The selected Firebase Authentication account must have a verified email.');
  }

  const users = await database.collection('users').get();
  let batch = database.batch();
  let writes = 0;
  for (const userDoc of users.docs) {
    const userProfile = userDoc.data();
    const updates = {
      password: FieldValue.delete(),
      tempPassword: FieldValue.delete()
    };
    if (typeof userProfile.email === 'string') {
      try {
        const linkedAuthUser = await auth.getUserByEmail(userProfile.email.trim().toLowerCase());
        updates.authUid = linkedAuthUser.uid;
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }
    }
    batch.update(userDoc.ref, updates);
    writes += 1;
    if (writes === 450) {
      await batch.commit();
      batch = database.batch();
      writes = 0;
    }
  }
  if (writes > 0) await batch.commit();

  const existingClaims = authUser.customClaims || {};
  await auth.setCustomUserClaims(authUser.uid, {
    ...existingClaims,
    role: 'Admin',
    fullName: typeof profile.fullName === 'string' ? profile.fullName.slice(0, 120) : '',
    functionRole: typeof profile.functionRole === 'string' ? profile.functionRole.slice(0, 120) : '',
    appAccess: true,
    isDeleted: false,
    permissions: PERMISSIONS,
    canDelete: true
  });
  await profileDoc.ref.update({ authUid: authUser.uid });

  console.log(`Bootstrap claims granted to the selected verified administrator. Migrated ${users.size} user profiles.`);
}

bootstrap().catch((error) => {
  console.error('Admin claim bootstrap failed:', error.message);
  process.exitCode = 1;
});
