# Security Specification - KBB App Firestore Rules

This document outlines the Security Specification, data invariants, and adversarial "Dirty Dozen" payloads to ensure zero-trust security on KBB App's collections.

## 1. Data Invariants
- **Identity Integrity**: Read and write actions on any sensitive record must be authenticated.
- **Client Integrity**: A client record must have a valid ID, non-empty String name, and correct number of active cases.
- **Task Integrity**: A task must refer to an existing case ID.
- **Invoice Integrity**: An invoice must refer to an existing case ID, with valid amounts (numeric total and paid values).

## 2. The "Dirty Dozen" Adversarial Payloads
Below are 12 malicious payloads designed to attempt to breach identity, type integrity, or status locks.

### Payload 1: Unauthorized Client Creation (No Auth)
- **Target**: `clients/`
- **Attempt**: Write a new client without auth credentials.
- **Outcome**: `PERMISSION_DENIED`

### Payload 2: Massive ID Poisoning
- **Target**: `clients/`
- **Attempt**: Set the id path parameter to a 20KB random garbage string.
- **Outcome**: `PERMISSION_DENIED`

### Payload 3: Injection of Ghost Field (Shadow Update)
- **Target**: `clients/some-id`
- **Attempt**: Add `isAdmin: true` or `shadow_bypass: "malicious"` to the client record.
- **Outcome**: `PERMISSION_DENIED`

### Payload 4: Arbitrary Client ID Overwrite
- **Target**: `clients/123/`
- **Attempt**: Set `id` field inside the payload to a separate integer different from its registration identifier.
- **Outcome**: `PERMISSION_DENIED`

### Payload 5: Negative Invoices (Financial Poisoning)
- **Target**: `invoices/inv-01`
- **Attempt**: Set `totalAmount` or `paidAmount` to a negative number or a 1MB string.
- **Outcome**: `PERMISSION_DENIED`

### Payload 6: Task Status Shortcuts
- **Target**: `tasks/task-01`
- **Attempt**: Update task status to an unknown status category.
- **Outcome**: `PERMISSION_DENIED`

### Payload 7: Unauthorized Lawyer Manipulation
- **Target**: `avocats/av-01`
- **Attempt**: Modify another attorney's Bar registration or discipline.
- **Outcome**: `PERMISSION_DENIED`

### Payload 8: Massive Text Payload (Denial-of-Wallet)
- **Target**: `cases/case-01`
- **Attempt**: Set `name` or `notes` to a 10MB random string of garbage characters.
- **Outcome**: `PERMISSION_DENIED`

### Payload 9: Empty/Malformed ID Creation
- **Target**: `personnels/pers-01`
- **Attempt**: Record personnel with blank string role or negative salary value.
- **Outcome**: `PERMISSION_DENIED`

### Payload 10: Parent-Less Invoice Creation
- **Target**: `invoices/inv-02`
- **Attempt**: Save a billing invoice referring to a missing or empty `caseId`.
- **Outcome**: `PERMISSION_DENIED`

### Payload 11: Direct User Role Spoofing (PII Leak)
- **Target**: `private/emails`
- **Attempt**: Force read on other colleagues' private details.
- **Outcome**: `PERMISSION_DENIED`

### Payload 12: Terminal Status Manipulation
- **Target**: `cases/case-02`
- **Attempt**: Re-update a closed dossier (`status: "Clôturé"`) to standard status categories.
- **Outcome**: `PERMISSION_DENIED`
