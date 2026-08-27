# Authentication & Access Control Flow: JNTUH CEJ Gate Monitor

This document outlines the multi-level authentication and access control flow for the system, ensuring secure and role-based interaction.

## 1. Entry Points
Users access the system via specialized portals based on their role:
- **Individual Access (Students/Faculty/Staff):** Digital ID, QR scan or manual ID entry.
- **Guardian Portal:** Real-time movement oversight.
- **Gate Operator Desk:** Scanner interaction and manual gate status entry.
- **Administration & IT:** Full system management.

## 2. Authentication Protocol
1.  **Selection:** User selects their portal from the landing page.
2.  **Verification:**
    - **Primary:** Cryptographic QR Code scan (for fast mobility).
    - **Secondary (Backup):** Manual Unique ID + Secure Authentication String (High-level security).
3.  **Authorization:** The auth middleware (`src/middleware/auth.ts`) validates the user's role against the requested resource path using the `authStore` session data.
4.  **Session:** A secure session is established, and the user is redirected to their specific dashboard.

## 3. RBAC (Role-Based Access Control)
Access is enforced at the middleware level:
- `Individual`: Limited access to own data/passes.
- Audit logs capture every access attempt, regardless of outcome, ensuring full traceability.
