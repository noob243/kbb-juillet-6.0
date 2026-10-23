# Security Specification for Firestore

## 1. Data Invariants
- Only authenticated users with `email_verified == true` can access data.
- Audit logs are append-only.
- All documents must belong to the organization/authenticated user context.
- IDs must be string, alphanumeric + hyphens/underscores, <= 128 chars.
- Timestamps must be server-generated.

## 2. The "Dirty Dozen" Payloads (Examples)
1. Unauthenticated read: `allow read: if false;` -> Should fail.
2. Incomplete audit log (missing timestamp): -> Should fail.
3. User setting `role: admin` in their own profile: -> Should fail.
4. User writing to `auditLogs`: -> Should fail (audit logs are system-only/server-side writes, but service uses client SDK).
5. User modifying another client: -> Should fail.
6. User ID injection: `projects/../../clients` -> Should fail.
7. Payload with "Ghost Field" (e.g., `isVerified: true` in `clients` update) -> Should fail.
8. Email spoofing (admin email, `email_verified: false`) -> Should fail.
9. Writing string to `totalAmount` in `invoices` -> Should fail.
10. Writing to `createdAt` after creation -> Should fail.
11. Writing 2MB string to `notes` field -> Should fail.
12. Writing to `fournisseurs` without required fields -> Should fail.

## 3. Test Runner (Conceptual)
Verify these via `firestore.rules.test.ts` (using firebase-js-sdk testing library).
