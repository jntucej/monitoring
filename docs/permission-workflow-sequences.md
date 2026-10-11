# Permission Workflow — Sequence Diagrams

All diagrams use Mermaid syntax. 
---

## 1. Hostel Permission — End-to-End

```mermaid
sequenceDiagram
    autonumber
    actor S as Student
    participant API as /api/permissions
    participant DB as permission_requests
    actor CT as Caretaker
    actor DW as Deputy Warden
    actor HM as Hostel Manager
    actor W as Warden/Principal
    actor OP as Operator
    participant BIO as /biometric
    participant N as Notifications
    participant A as audit_logs

    S->>API: POST { workflowType: "hostel", reason, fromDate, toDate }
    API->>DB: INSERT ticket HST-1001, stage=caretaker, status=PENDING
    API->>N: notify caretaker (hostel_scope matched)
    API->>A: PERMISSION_CREATED
    API-->>S: { ticketNumber: "HST-1001" }

    CT->>API: PATCH { action: "approve" }
    API->>DB: stage=deputy_warden, append history
    API->>N: notify deputy warden
    API->>A: PERMISSION_APPROVED
    API-->>CT: ok

    DW->>API: PATCH { action: "approve" }
    API->>DB: stage=hostel_manager
    API->>N: notify hostel manager
    API-->>DW: ok

    HM->>API: PATCH { action: "approve" }
    API->>DB: stage=warden_or_principal
    API->>N: notify warden + principal
    API-->>HM: ok

    W->>API: PATCH { action: "approve" }
    API->>DB: stage=main_gate (guard: biometric_hostel_at IS NULL)
    API->>N: notify operator + student
    API-->>W: ok

    CT->>BIO: POST { stage: "hostel", deviceType, signature }
    alt Device ENABLED
        BIO->>BIO: verifyThumbprint() / verifyFace()
        alt verification fails
            BIO-->>CT: 400 BIOMETRIC_FAILED
        else verification ok
            BIO->>DB: biometric_hostel_at = NOW()
        end
    else Device DISABLED
        BIO->>DB: biometric_hostel_at = NOW()  (auto-pass)
    end
    BIO->>N: notify gate operator
    BIO->>A: PERMISSION_BIOMETRIC_VERIFIED (hostel)
    BIO-->>CT: ok

    OP->>BIO: POST { stage: "gate", deviceType, signature }
    BIO->>DB: biometric_gate_at = NOW(), stage=completed, status=COMPLETED
    BIO->>N: notify student (completed)
    BIO->>A: PERMISSION_BIOMETRIC_VERIFIED (gate)
    BIO-->>OP: ok

    S->>API: GET /permissions/HST-1001
    API-->>S: { status: "COMPLETED" }
```

---

## 2. Exam Document — Full Flow

```mermaid
sequenceDiagram
    autonumber
    actor S as Student
    participant API as /api/permissions
    participant UP as /upload
    participant DOC as /document
    participant SIGN as /sign
    participant DB as permission_requests
    actor F as Faculty
    actor H as HOD
    actor O as OIE
    actor VP as Vice Principal
    actor P as Principal
    participant A as audit_logs

    S->>API: POST { workflowType: "exam", documentRequired: true }
    API->>DB: EXM-1001, stage=faculty, status=PENDING
    API-->>S: ticketNumber

    F->>API: PATCH { action: "approve" }
    API->>DB: stage=hod

    H->>API: PATCH { action: "approve" }
    API->>DB: stage=oie

    Note over S,UP: HOD approved — student can now upload
    S->>UP: POST multipart { file: document.pdf }
    UP->>UP: validate PDF, size <= 10MB
    UP->>UP: write data/uploads/permissions/EXM-1001/document.pdf
    UP->>DB: document_url = /api/permissions/EXM-1001/document
    UP-->>S: { documentUrl }

---

## 3. Memo Workflow

```mermaid
sequenceDiagram
    autonumber
    actor S as Student
    participant API as /api/permissions
    actor F as Faculty
    actor H as HOD
    actor O as OIE
    actor VP as Vice Principal
    actor P as Principal
    participant SIGN as /sign

    S->>API: POST { workflowType: "memo", documentRequired: true }
    API-->>S: MEM-1001

    F->>API: PATCH approve
    H->>API: PATCH approve
    S->>API: POST /upload { document.pdf }
    O->>API: PATCH approve
    VP->>API: PATCH approve
    P->>SIGN: POST sign
    SIGN-->>S: COMPLETED
```

---

## 4. Staff Leave Workflow

```mermaid
sequenceDiagram
    autonumber
    actor ST as Staff
    participant API as /api/permissions
    actor H as HOD
    actor VP as Vice Principal
    actor P as Principal

    ST->>API: POST { workflowType: "staff_leave" }
    API-->>ST: STF-1001
    H->>API: PATCH approve
    VP->>API: PATCH approve
    P->>API: PATCH approve
    API-->>ST: COMPLETED
```

---

## 5. Bulk Approve Flow

```mermaid
sequenceDiagram
    autonumber
    actor A as Approver
    participant UI as PermissionList.tsx
    participant B as /api/permissions/bulk
    participant ENG as permission-workflow.ts
    participant DB as permission_requests
    participant AUD as audit_logs

    A->>UI: select 5 rows, click Approve
    UI->>B: POST { tickets: [...], action: "approve" }
    loop for each ticket (sequential)
        B->>DB: fetch ticket
        B->>ENG: canApproveAtStage(role, workflow, stage)
        alt allowed & PENDING
            B->>ENG: applyPermissionAction()
            B->>DB: update stage / status
            B->>AUD: PERMISSION_BULK_APPROVE
        else forbidden / not_pending
            B->>B: record skip reason
        end
    end
    B-->>UI: { results, summary: { ok, forbidden, not_pending, ... } }
    UI->>A: toast "Approved 3 of 5 · 2 skipped"
```

---

## 6. Biometric Verification (Device ON vs OFF)

```mermaid
sequenceDiagram
    autonumber
    actor U as Approver/Operator
    participant H as useDeviceSettings
    participant BIO as /biometric
    participant SET as device_verification_settings
    participant VF as verifyThumbprint/Face
    participant DB as permission_requests

    U->>H: render BiometricCheckPanel
    H->>SET: SELECT device_type, enabled
    SET-->>H: { thumb: off, face: off }

    alt Device OFF (default)
        H-->>U: "Mark Complete (device disabled)"
        U->>BIO: POST { stage, no signature }
        BIO->>DB: stamp biometric_*_at = NOW()
        BIO-->>U: ok (soft-pass)
    else Device ON
        H-->>U: "Verify at Hostel (Thumbprint)"
        U->>BIO: POST { stage, deviceType, signature }
        BIO->>VF: verify(signature)
        alt valid
            VF-->>BIO: true
            BIO->>DB: stamp biometric_*_at = NOW()
            BIO-->>U: ok
        else invalid
            VF-->>BIO: false
            BIO-->>U: 400 BIOMETRIC_FAILED
        end
    end
```

---

## 7. Role → Stage Authorization

```mermaid
flowchart LR
    subgraph Roles
        CT[caretaker]
        DW[deputy_warden]
        HM[hostel_manager]
        W[warden]
        P[principal]
        OP[operator]
        F[faculty]
        H[hod]
        O[oie]
        VP[vice_principal]
        AD[admin/sysadmin]
    end

    subgraph Stages
        S1[caretaker]
        S2[deputy_warden]
        S3[hostel_manager]
        S4[warden_or_principal]
        S5[main_gate]
        S6[faculty]
        S7[hod]
        S8[oie]
        S9[vice_principal]
        S10[principal]
    end

    CT --> S1
    DW --> S2
    HM --> S3
    W --> S4
    P --> S4
    P --> S10
    OP --> S5
    F --> S6
    H --> S7
    O --> S8
    VP --> S9
    AD -. override .-> S1
    AD -. override .-> S2
    AD -. override .-> S3
    AD -. override .-> S4
    AD -. override .-> S5
    AD -. override .-> S6
    AD -. override .-> S7
    AD -. override .-> S8
    AD -. override .-> S9
    AD -. override .-> S10
```

    O->>API: PATCH { action: "approve" }
    API->>DB: stage=vice_principal

    VP->>API: PATCH { action: "approve" }
    API->>DB: stage=principal

    P->>DOC: GET preview
    DOC-->>P: PDF stream (inline)

    P->>SIGN: POST { signatureNote }
    SIGN->>SIGN: signature_hash = SHA-256(pdf || ticket || signerId || ts)
    SIGN->>SIGN: copy document.pdf -> document_signed.pdf
    SIGN->>DB: INSERT document_signatures
    SIGN->>DB: digital_signature = hash, stage=completed, status=COMPLETED
    SIGN-->>P: { signatureHash }

    S->>DOC: GET signed PDF
    DOC-->>S: document_signed.pdf
```