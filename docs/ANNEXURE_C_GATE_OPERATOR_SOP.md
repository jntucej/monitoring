# ANNEXURE C: GATE OPERATOR STANDARD OPERATING PROCEDURE (SOP)

**System Name:** Educational Institution Gate Monitoring & Access Control System  
**Document Code:** SOP-OPS-001  
**Version:** 1.0.0  
**Effective Date:** August 17, 2026  

---

## 1. Objective & Operational Scope

This Standard Operating Procedure (SOP) outlines the required protocol for Gate Security Operators using the dynamic Gate Monitoring System terminal. Compliance with this procedure is mandatory to ensure institutional safety, accurate campus occupancy metrics, and unauthorized access prevention.

---

## 2. Shift Initialization & System Setup

### 2.1 Pre-Shift Hardware Check
1. Ensure the scanning tablet / desktop barcode scanner terminal is securely mounted and powered.
2. Verify active local network (LAN) or Wi-Fi connectivity via the top status indicator bar (**Status: ONLINE**).
3. Inspect camera lens for smudges or physical obstruction.

### 2.2 Operator Terminal Authentication
1. Open the Gate Monitor Operator Interface (`/gate` or main login screen).
2. Select your assigned physical gate terminal (e.g., *Gate 1 - Main Entrance*, *Gate 3 - Hostel North*).
3. Authenticate using your assigned 4-digit or 6-digit **Security PIN** or full employee credentials.
4. Verify your name and active Gate ID appear in the top navigation header bar.

```
 +-------------------------------------------------------------------------+
 | GATE TERMINAL SHIFT INITIALIZATION                                      |
 |                                                                         |
 | [Step 1: Select Gate]  ==>  [Step 2: Enter PIN]  ==>  [Step 3: Confirm] |
 |  Select: Gate 1 Main        PIN: ****                  "Operator: John" |
 +-------------------------------------------------------------------------+
```

---

## 3. Standard Student Verification Workflow

### 3.1 Scanner Operation (Optical / QR Scan)
1. Instruct arriving/departing student to present their digital dynamic QR code from the institution app or physical RFID smartcard.
2. Align QR code within the viewfinder frame of the screen.
3. Upon scan detection, the terminal will instantly query the backend verification engine (`/api/gate/scan`).

### 3.2 Decision Tree & System Responses

```
                                 [ SCAN DETECTED ]
                                         |
                                         v
                         +-------------------------------+
                         | Validating Token & Identity   |
                         +---------------+---------------+
                                         |
                +------------------------+------------------------+
                |                                                 |
         [ STATUS: VALID ]                                 [ STATUS: DENIED ]
                |                                                 |
   +------------+------------+                       +------------+------------+
   |                         |                       |                         |
(OUT SCAN)                (IN SCAN)            (EXPIRED / NO PASS)   (SUSPENDED STUDENT)
   |                         |                       |                         |
- Display Green Flash    - Display Green Flash   - Red Flash           - Red Siren Flash
- Play Audio Chime       - Play Audio Chime      - Play Error Tone     - System Alert Raised
- Allow Exit             - Allow Entrance        - Direct to Security  - Detain & Contact
```

### 3.3 Status Indicators & Action Rules

| Visual Indicator | Audio Feedback | Backend Status Reason | Mandatory Action Required |
| :--- | :--- | :--- | :--- |
| **GREEN FLASH** | Single High Beep | `PASS_VALID` / `REGULAR_ALLOW` | **ALLOW ENTRY / EXIT.** Student details log automatically. |
| **RED FLASH** | Double Low Beep | `NO_PASS_FOUND` | **DENY EXIT.** Hostel students require active approved pass for outbound movement. |
| **YELLOW WARNING**| Single Warning | `CURFEW_VIOLATION` | **ALLOW WITH WARNING.** Log late return flag; system notifies Warden automatically. |

---

## 4. Exceptional Scenarios & Manual Overrides

### 4.1 Unrecognized QR Code / Camera Failure
If a student's mobile screen is cracked or damaged, preventing optical QR reading:
1. Click the **"Manual Verification"** button on the terminal UI (`ManualEntryDialog.tsx`).
2. Input the student's unique **Roll Number** (e.g., `21CS042`).
3. System will pull student photo, department, and pass status.
4. Verify physical face match against system photo display.
5. Select Direction (**IN** or **OUT**) and Reason, then click **Confirm Manual Scan**.
6. *Note: All manual entry logs are permanently flagged with `is_manual: true` for audit oversight.*

### 4.2 Emergency Gate Override (Evacuation Protocol)
In event of fire, campus emergency, or total power failure:
1. Physical gate barriers automatically drop/unlock via fail-safe power relays.
2. Security staff must clear physical passageways immediately.

---


- Student disputes a pass denial or claims system approval error.
- Repeated scan failure on valid physical ID card.
- Suspicion of identity theft, card sharing, or screenshot reuse.
- System error status `500 Internal Server Error` or persistent offline banner.

### 5.2 Shift Handover Protocol
1. Review terminal summary metrics (*Total In Scans*, *Total Out Scans*, *Manual Overrides*).
2. Click **Logout / End Shift** to terminate active session tokens.
3. Ensure next operator logs in under their individual PIN/credentials. **Sharing logged-in accounts is strictly prohibited.**
