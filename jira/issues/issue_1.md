Here is the detailed context for every issue from the table. Each entry explains **where** the issue lives, **what** it is, **why** it matters, and **what** the current behaviour is.

---

### CR-01 — WebAuthn scanner verifies the operator, not the student

**Where:**
- `src/components/operator/WebAuthnScanner.tsx`
- `src/app/api/webauthn/authenticate/start/route.ts`
- `src/app/api/webauthn/authenticate/finish/route.ts`
- Used in `src/app/(operator)/gate/[gateId]/page.tsx`

**Context:**
The operator page displays a student’s name and photo (from `currentStudent`) and then opens `WebAuthnScanner` with `personId={currentStudent.id}` and `personName={currentStudent.fullName}`. However, inside `WebAuthnScanner`, the `handleAuthenticate` function calls:

```ts
const res = await fetch('/api/webauthn/authenticate/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

The server route `start/route.ts` then does:

```ts
const user = await requireAuthenticatedUser(token);
const options = await startAuthentication(user.userId);
```

So the biometric challenge is generated for the **operator’s** `userId` — the person who is logged into the gate terminal — not for the student being scanned. The `personId` passed to the component is completely ignored on the server side.

**Why it matters:**
This is a critical correctness and security bug. The system claims to verify the student’s identity, but it actually verifies the operator’s fingerprint/face. A student can be scanned without any biometric check, and any operator with a registered passkey can authorise any student. The entire biometric gate verification is effectively non-functional.

**Expected:**
A new Face ID verification endpoint should be called with the **target student’s** `userId`, and the server should verify the captured face against that student’s enrolled face template, not the operator’s WebAuthn credential.

---

### CR-02 — Legacy thumbprint system is mock-only and must be removed

**Where:**
- `src/app/api/operator/register-thumbprint/route.ts`
- `scripts/generate-thumbprint-hash.js`
- `scripts/seed-thumbprints.js`
- `src/components/sysadmin/UserManagement.tsx`
- `src/lib/types.ts` (`thumbprintHash`, `thumbprintVerifiedAt`)
- `supabase/schema.sql` (`users.thumbprint_hash`, `users.thumbprint_verified_at`)

**Context:**
The current “thumbprint” system is a placeholder. In `UserManagement.tsx`, the `registerThumbprint` function creates a mock signature:

```ts
const signature = `sig:${user.id}`;
```

It then posts to `/api/operator/register-thumbprint`, which hashes that signature with bcrypt and stores the hash in `users.thumbprint_hash`. There is no actual fingerprint scanner integration, no raw biometric data, and no verification against a live fingerprint.

Similarly, `scripts/generate-thumbprint-hash.js` and `scripts/seed-thumbprints.js` generate bcrypt hashes for deterministic signatures like `sig:<uuid>`. This was useful for testing, but it is not a real biometric system.

**Why it matters:**
The system appears to have biometric verification, but it is security theatre. Anyone who knows a user’s UUID can compute the same `sig:<uuid>` string and register/verify a thumbprint. The stored hash provides no real security. Continuing to maintain this code creates confusion, false confidence, and attack surface.

**Expected:**
Delete the thumbprint route, scripts, and all references. Replace with a real Face ID enrollment/verification API. Keep the old columns temporarily for migration, but mark them deprecated and drop them after the Face ID pilot.

---

### CR-03 — No face enrollment/verification schema exists

**Where:**
- `supabase/schema.sql`
- `supabase/migrations/` (no face‑related migration)

**Context:**
The database currently has a `webauthn_credentials` table for WebAuthn passkeys, and the old `users.thumbprint_hash` column. There is **no** table to store face enrollment templates, liveness results, verification events, or consent records. Without this schema, you cannot:

- Store encrypted face templates per user.
- Record which provider was used (e.g., AWS Rekognition, on‑prem InsightFace).
- Track liveness pass/fail.
- Audit every face verification attempt (match/no‑match/liveness fail/error).
- Revoke a user’s face enrollment.

**Why it matters:**
Face ID is a biometric system. It requires careful data modelling for security, privacy, and auditability. Without a schema, you cannot build a compliant or testable implementation. You also cannot migrate from thumbprint to face in a controlled way.

**Expected:**
Add at least:
- `face_enrollments` — encrypted template, provider, version, status, enrolled_by, enrolled_at, revoked_at.
- `face_verification_events` — user_id, scan_id, gate_id, direction, result, score, liveness_passed, provider, device_id, created_at.
- Optionally `biometric_consents` — user consent, timestamp, policy version.

---

### CR-04 — Operator override flow is too weak for biometric failure

**Where:**
- `src/app/api/operator/override-biometric/route.ts`
- `src/components/operator/WebAuthnScanner.tsx` (the “Override Biometric & Proceed” button)

**Context:**
When biometric verification fails (or no biometric is enrolled), the operator sees a button “Override Biometric & Proceed”. Clicking it calls:

```ts
await fetch('/api/operator/override-biometric', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ personId, personName, gateId, reason: 'Operator manual override at gate scanner' })
});
```

The server logs an audit entry, creates a high‑severity alert, and sends notifications to sysadmin/admin. However, the override itself requires **no additional authentication**. Any operator can click the button and bypass Face ID entirely. There is no supervisor PIN, no step‑up auth, and no second‑person approval.

**Why it matters:**
Face ID is meant to be a strong verification. If it can be bypassed with a single click, its security value is drastically reduced. A malicious or negligent operator could override repeatedly without oversight. The alert is useful for after‑the‑fact detection, but it does not prevent the bypass.

**Expected:**
Override should require at least one of:
- Supervisor PIN (entered by a supervisor on the terminal).
- Step‑up authentication (e.g., the operator re‑enters their own PIN).
- Two‑person rule (operator + supervisor approval).

The override event should still be logged and alerted, but the barrier to entry must be higher.

---

### CR-05 — WebAuthn registration is sysadmin‑only, which does not scale for Face ID

**Where:**
- `src/app/api/webauthn/register/start/route.ts`
- `src/app/api/webauthn/register/finish/route.ts`

**Context:**
Both registration routes enforce:

```ts
const user = await requireRole(token, 'sysadmin');
```

This means only a sysadmin can register a WebAuthn credential for themselves. If Face ID enrollment follows the same pattern, then only sysadmins could enroll their faces. But Face ID is intended for **all gate users** — students, faculty, staff, workers, and possibly visitors. Requiring a sysadmin to personally enroll every user is operationally impossible.

**Why it matters:**
The enrollment flow must be designed for scale and appropriate trust levels. Without a clear policy, you either:
- Keep enrollment sysadmin‑only (unworkable), or
- Open enrollment too widely (security risk).

**Expected:**
Define an enrollment policy, for example:
- **Students:** self‑service via student portal with OTP/email verification, or assisted enrollment at admin office.
- **Faculty/staff/workers:** self‑service with admin approval, or HR‑assisted enrollment.
- **Visitors:** ephemeral face capture at gate, not stored long‑term.
- **Sysadmins/admins:** self‑service with strong MFA.

The API routes must support these different enrollment paths and enforce the correct role/consent checks.

---

### CR-06 — UI and types still use thumbprint terminology

**Where:**
- `src/lib/types.ts` (`thumbprintHash`, `thumbprintVerifiedAt`)
- `src/components/sysadmin/UserManagement.tsx` (shows “Biometric ✓”, “No biometric”, uses `thumbprintHash`)
- `src/stores/operatorStore.ts` (`thumbprintVerified`, `thumbprintFallback`, `setThumbprintStatus`)
- `src/components/operator/ScanConfirmation.tsx` (`thumbprintVerified` prop)
- `src/app/(operator)/gate/[gateId]/page.tsx` (passes `thumbprintVerified` to `ScanConfirmation`)
- Labels: “Biometric”, “Thumbprint”, “Register”, “Clear”

**Context:**
The entire codebase still refers to “thumbprint” or “biometric” in a generic way. For example, `UserManagement` displays a green “Biometric ✓” badge when `user.thumbprintHash` is present. `ScanConfirmation` accepts a `thumbprintVerified` boolean. The operator store has `setThumbprintStatus`.

This naming is now misleading because the feature is being replaced by Face ID. It also makes it harder to grep for all places that need to change.

**Why it matters:**
Inconsistent terminology causes developer confusion, bugs during migration, and a poor user experience (users see “thumbprint” when the system uses face). It also makes it difficult to ensure all legacy references are removed.

**Expected:**
Rename across the codebase:
- `thumbprintHash` → `hasFaceEnrollment` (boolean) or `faceEnrollmentId`
- `thumbprintVerifiedAt` → `faceEnrolledAt`
- `thumbprintVerified` → `faceVerified`
- `thumbprintFallback` → `faceFallback`
- `setThumbprintStatus` → `setFaceStatus`
- UI labels: “Thumbprint” → “Face ID”, “Register” → “Enroll Face”, etc.

Update all types, components, stores, and API responses.

---

### CR-07 — No Face ID tests exist

**Where:**
- `tests/` directory (currently no face‑specific tests)
- Existing tests: `tests/scan-workflow.spec.ts`, `tests/app.spec.ts`, etc.

**Context:**
There are tests for scanning workflow, API idempotency, network status, and WebAuthn indirectly (through operator flow). However, there are **no tests** for:
- Face enrollment success/failure.
- Face verification success/failure.
- Liveness detection (spoof attempts with photo, video, mask).
- Revocation of face enrollment.
- Override flow with supervisor PIN.
- Role permissions for enrollment.
- Audit logging of face events.
- Performance under load (multiple gates verifying simultaneously).

**Why it matters:**
Biometric systems are security‑critical. Without thorough testing, you risk:
- False accepts (wrong person allowed in).
- False rejects (legitimate users blocked).
- Spoofing vulnerabilities.
- Inconsistent behaviour across devices.
- Regressions when refactoring.

**Expected:**
Create a test plan and implement:
- Unit tests for the face provider abstraction.
- API tests for enroll/verify/revoke/override.
- E2E tests using a mock face provider (and later real provider).
- Spoof tests (photo, video, printed mask, deepfake).
- Performance tests (latency < 1s, concurrent gates).
- Regression tests to ensure no thumbprint references remain.

---

### CR-08 — Face provider not selected

**Where:**
- Architectural decision, no code yet.
- Relevant files: `src/lib/` (would host provider integration), `supabase/schema.sql` (provider column).

**Context:**
To implement Face ID, you must choose a face recognition provider. Options include:
- **On‑prem:** InsightFace, CompreFace, OpenCV‑based, custom models.
- **Cloud:** AWS Rekognition, Azure Face, Google Cloud Vision, Face++
- **Hybrid:** Local inference for liveness + cloud for matching, etc.

Each option has different implications for latency, cost, privacy, compliance, and hardware.

**Why it matters:**
Without a provider decision, you cannot:
- Design the API contract (what data is sent/received).
- Estimate infrastructure costs.
- Implement liveness detection correctly.
- Ensure data residency and privacy compliance.
- Build tests against a stable interface.

**Expected:**
Akarsh and Junaid must evaluate and select a provider. Criteria:
- Latency (< 1s for gate throughput).
- Liveness/anti‑spoof support.
- On‑prem vs cloud (privacy, network reliability).
- Cost per verification.
- SDK quality and language support.
- Compliance (GDPR, local regulations).

Document the decision and create a provider abstraction layer.

---

### CR-09 — Gate camera hardware not provisioned

**Where:**
- Physical gate terminals.
- No hardware spec exists in the repo.

**Context:**
Face ID requires a camera at each gate. The current gates may only have QR scanners or turnstiles. To capture faces reliably, you need:
- Ruggedised cameras/tablets suitable for outdoor/indoor gate environments.
- Infrared (IR) or 3D depth sensors for liveness detection (to prevent photo/video spoofing).
- Adequate lighting or IR illumination for night operation.
- Network connectivity and power.
- Mounting hardware and enclosures.

**Why it matters:**
Without proper hardware, Face ID cannot be captured or verified. Cheap webcams are easily spoofed and perform poorly in varied lighting. This is a physical infrastructure blocker.

**Expected:**
Junaid to:
- Spec camera requirements (resolution, IR, depth, IP rating).
- Select vendor/model (e.g., Intel RealSense, Orbbec, custom Android tablet with IR).
- Pilot at one gate.
- Roll out to all gates after successful pilot.

---

### CR-10 — Face template privacy not designed

**Where:**
- No code yet; requires design in `supabase/schema.sql`, `src/lib/` provider integration, and compliance docs.

**Context:**
Face templates are sensitive biometric data. Regulations (GDPR, BIPA, India DPDP Act) impose strict rules:
- Explicit consent.
- Encryption at rest and in transit.
- Right to erasure.
- Data minimisation.
- Retention limits.
- Audit trails.

The current design has no encryption strategy for face templates, no consent capture, no retention policy, and no revocation mechanism beyond deleting a row.

**Why it matters:**
Non‑compliance can lead to fines, legal action, and reputational damage. Biometric data breaches are especially serious. You must design privacy and security from the start.

**Expected:**
- Encrypt face templates with a KMS‑managed key (e.g., AWS KMS, Azure Key Vault, HashiCorp Vault).
- Store only encrypted templates; never raw images.
- Capture explicit consent with timestamp and policy version.
- Define retention (e.g., until user leaves institution + 30 days).
- Provide a revocation API that deletes the template and marks enrollment revoked.
- Audit every access to templates.

---

### CR-11 — No liveness/anti‑spoof plan

**Where:**
- No code yet; relevant to provider selection and camera hardware.

**Context:**
Face recognition without liveness detection is trivially spoofed with a printed photo, a video on a phone, or a mask. The current codebase has no liveness logic. The WebAuthn scanner uses platform authenticators (which have their own liveness), but Face ID at a gate is different — it’s a camera capturing a face in front of it.

**Why it matters:**
If spoofing is possible, the entire Face ID system is insecure. An attacker could hold up a photo of a legitimate student and gain entry.

**Expected:**
Implement liveness detection using:
- 3D depth sensors (e.g., structured light, time‑of‑flight).
- IR cameras to detect heat/skin.
- Challenge‑response (e.g., “blink”, “turn head”).
- AI‑based liveness models (passive or active).

This must be integrated into the face verification flow and tested against spoof attempts.

---

### CR-12 — Strict online policy vs face latency

**Where:**
- `src/stores/operatorStore.ts` (`confirmScan` checks `navigator.onLine` and blocks if offline)
- `src/app/api/gate/scan/route.ts` (requires online)
- Any face verification API would also require online if cloud‑based.

**Context:**
The application enforces a “100% strict online policy” for scans. If Face ID verification uses a cloud provider, it adds network latency (e.g., 300–800 ms per verification). During peak gate hours (e.g., morning rush), this could cause queues and delays. If the network drops, gates would be blocked entirely.

**Why it matters:**
Gate throughput is critical. Even 1–2 seconds per person can cause long queues. The strict online policy may conflict with the need for fast, reliable Face ID verification.

**Expected:**
Options:
- Use on‑prem face recognition to keep latency low (< 200 ms).
- Implement local liveness detection with cloud matching for higher accuracy.
- Cache enrolled templates locally (encrypted) for offline verification, with sync when online.
- Provide a fallback to operator override (with supervisor PIN) if Face ID cannot complete within a timeout.

Akarsh and Junaid must decide the trade‑offs and adjust the strict online policy if necessary.

---

### CR-13 — Thumbprint columns still in schema

**Where:**
- `supabase/schema.sql`:
  ```sql
  thumbprint_hash      TEXT,
  thumbprint_verified_at TIMESTAMPTZ,
  ```

**Context:**
The `users` table still has `thumbprint_hash` and `thumbprint_verified_at` columns. These are used by the legacy thumbprint system (CR-02). Once Face ID is implemented, these columns become obsolete.

**Why it matters:**
Leaving them creates data migration debt, confusion, and potential security risks (e.g., someone might still write to them). They also bloat the schema and make it unclear which biometric system is authoritative.

**Expected:**
- Phase 1: Mark as deprecated in comments, stop writing to them.
- Phase 2: After Face ID pilot and migration, drop the columns in a migration.
- Ensure all code references are removed before dropping.

---

### CR-14 — Scripts and docs reference thumbprint

**Where:**
- `scripts/generate-thumbprint-hash.js`
- `scripts/seed-thumbprints.js`
- Possibly `docs/` (not fully reviewed, but likely mentions thumbprint).

**Context:**
These scripts generate bcrypt hashes for mock thumbprint signatures and are used for seeding test data. They are not needed for Face ID. Keeping them:
- Confuses developers about which biometric system is in use.
- Wastes maintenance effort.
- May be accidentally run in production.

**Why it matters:**
Dead code and outdated scripts increase cognitive load and risk. They should be removed as part of the migration.

**Expected:**
Delete both scripts. Search the codebase for any other references to “thumbprint” in scripts, docs, or comments, and update or remove them.

---

### CR-15 — `operatorStore` naming is stale

**Where:**
- `src/stores/operatorStore.ts`

**Context:**
The operator store contains:
```ts
thumbprintVerified: boolean;
thumbprintFallback: boolean;
setThumbprintStatus: (verified: boolean, fallback?: boolean) => void;
```
These are used by `ScanConfirmation` and the operator page to manage the biometric verification state. The names are now inaccurate because the system will use Face ID.

**Why it matters:**
Stale naming makes the code harder to understand and maintain. It also makes it easy to miss places that need updating when the face verification flow is implemented. Developers might accidentally use the old thumbprint logic.

**Expected:**
Rename to:
- `faceVerified`
- `faceFallback`
- `setFaceStatus`
Update all usages in `ScanConfirmation`, `src/app/(operator)/gate/[gateId]/page.tsx`, and any other components. Also update the `ScanConfirmation` prop name from `thumbprintVerified` to `faceVerified`.