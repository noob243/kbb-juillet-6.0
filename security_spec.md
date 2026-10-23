# Security configuration and deployment

## Access control

Firestore denies access by default. Authenticated users must have a verified Firebase
Authentication email and server-issued custom claims (`appAccess`, `role`,
`isDeleted`, and `permissions`) before the rules grant access. The client must not
be treated as an authorization boundary.

The application currently models one cabinet and has no organization identifier
on its records. These rules do not provide tenant isolation. Add and backfill an
organization identifier throughout the data model before using the application
for multiple independent cabinets.

## One-time migration

1. Back up Firestore and Firebase Authentication data.
2. In a trusted environment with Application Default Credentials, set
   `BOOTSTRAP_ADMIN_EMAIL` to the address of the intended existing, active,
   verified administrator, then run:

   ```sh
   node functions/bootstrapAdminClaims.js
   ```

   The script removes legacy plaintext password fields from user profiles,
   associates the designated administrator's Auth UID, and grants that account
   administrator claims. Review its output and confirm the account before
   proceeding. Do not run it against an unverified account.
3. Set the Cloud Functions secrets listed below.
4. The Functions package now targets Node.js 22 and current major releases of
   Firebase Admin, Cloud Functions, and Nodemailer. Confirm the selected Firebase
   project supports Node.js 22 before deployment.
5. Deploy the Cloud Functions and Firestore rules using the Firebase project
   deployment configuration. This repository currently has no `firebase.json`
   or `.firebaserc`, so configure and verify the intended project and deployment
   targets before using the Firebase CLI. Rules must be deployed only after the initial
   administrator has claims, or no application users will be able to access
   protected records.
6. Deploy the frontend. Existing users need Firebase Auth accounts with verified
   email addresses. An administrator must update/save each existing user profile
   to synchronize that user's claims; users without claims remain denied.
7. After claims or account state change, require a fresh sign-in/token refresh
   before expecting the updated access in the client.

Do not deploy to production until a staging project has verified login, user
provisioning, role/permission changes, deletion, Firestore reads/writes, and
recovery flows.

## Cloud Functions secrets

The reminder email function reads SMTP credentials from Firebase Secret Manager:

```sh
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
```

The AI callable reads the Gemini key from Secret Manager:

```sh
firebase functions:secrets:set GEMINI_API_KEY
```

Do not put SMTP or Gemini secrets in Vite variables, frontend configuration,
source control, or client storage. Rotate any credential that has previously
been committed or exposed. Configure SMTP least privilege and restrict outbound
mailing as appropriate.

## API and client configuration

Firebase web API keys identify the Firebase project; they are not server
credentials. Restrict the key in Google Cloud Console to the production and
staging web origins and only the APIs required by the client. Enable Firebase App
Check for supported services and monitor enforcement before requiring it.

Keep local `.env` files out of source control. `.env.example` may contain
placeholder names only, never working credentials. Removing a file from the
current Git index does not erase it from prior commits; inspect repository
history locally without printing secret values. If a real key was committed,
revoke or rotate it. Rewrite shared Git history only with explicit coordination.

## Operational notes

- Never store passwords in Firestore, local storage, or application profiles.
  Use Firebase Authentication and its password reset flow.
- Custom claims are assigned only by trusted Cloud Functions/Admin SDK code.
  Never accept client-supplied role or permission claims.
- The client can request audit records, but client-written logs are not
  tamper-proof. Use trusted server-side event logging for compliance or
  non-repudiation requirements.
- Review Firestore rules whenever collections or query patterns change. Validate
  them in the Firebase Emulator Suite and test both allowed and denied cases.
- Apply least privilege to Firebase IAM, Cloud Functions service accounts,
  SMTP accounts, and API keys; enable App Check where supported.
