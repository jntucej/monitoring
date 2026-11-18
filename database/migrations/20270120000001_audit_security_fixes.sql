-- 20270120: Two security fixes found during the full role endpoint audit.
--
-- 1. GUARDIAN/VERIFY RBAC GAP
--    /api/guardian/verify accepted any authenticated user's JWT (no
--    requiredRole). A student could call the guardian OTP-verify endpoint
--    with their own token. Fixed in the route handler — not in this
--    migration, just documented here.
--
-- 2. LOGIN_SUCCESS AUDIT GAP
--    Successful password logins produce no LOGIN_SUCCESS audit row.
--    The only audit trail for a login is SESSION_FAMILY_CREATED (which
--    fires after the session is minted, not at credential verification).
--    This makes it impossible to answer "when did user X last log in?"
--    from audit_logs alone. Add LOGIN_SUCCESS to the allowed-action
--    constraint so the login route can emit it.

-- ─── 1. Add LOGIN_SUCCESS to the audit_logs action constraint ─────────────
-- The CHECK constraint is a fixed list; we must drop and re-add it with the
-- new value. The new action is only written by /api/auth/login on success.
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_action_known;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_action_known CHECK (
    action IN (
      '20261231000001','2FA_SETUP_INITIATED','ACCOUNT_STATUS_CHANGED',
      'ADMIN_EXPORT','ANNOUNCEMENT_CREATED','ANTI_RAGGING_CASE_FILED',
      'AUDIT_LOG_ROTATION_COMPLETED','BACKUP_VERIFIED','BULK_USER_IMPORT',
      'COMPLAINT_CREATED','DELEGATION_CREATED','DEV_CONTACT_SENT',
      'DEVICE_SETTING_UPDATED','ENROLLMENT_CODE_ISSUED','ENROLLMENT_CODE_REJECTED',
      'GATE_PASS_APPROVED','GATE_PASS_CREATED','GATE_SCAN_RECORDED',
      'LOGIN_FAILED','LOGIN_SUCCESS',
      'MANUAL_ENTRY_AUTHORIZED','MEAL_OPT_OUT_CREATED','MESS_PREFERENCE_UPDATED',
      'MESS_SPECIAL_EVENT_CREATED','MESS_SPECIAL_INTEREST_SAVED',
      'MESS_TOKEN_GENERATED','MESS_TOKEN_SERVED','MESS_TOKEN_VERIFIED',
      'MESS_TOKEN_VERIFY_FAILED','MOVEMENT_CREATED','ONBOARDING_STEP_COMPLETED',
      'OPERATOR_ACTION_APPROVED','OPERATOR_ACTION_PENDING_CREATED',
      'OPERATOR_KIOSK_SESSION','PASSWORD_CHANGED',
      'PERMISSION_REQUEST_APPROVED','PERMISSION_REQUEST_CREATED',
      'PERMISSION_REQUEST_REJECTED','PG_TEST','PIN_LOGIN_FAILED','PIN_LOGIN_SUCCESS',
      'REFRESH_REUSE_DETECTED','REFRESH_ROTATED','RETENTION_CLEANUP','ROLE_CHANGED',
      'SCAN_CREATED','SCAN_REJECTED','SECURITY_SETTINGS_UPDATE',
      'SESSION_FAMILY_CREATED','SESSION_FORCE_REVOKED','SESSION_ROTATED',
      'SMART_SCHEDULE_APPLIED','SSO_CONFIG_UPDATE','STUDENT_TYPE_CHANGED_AT_ENTRY',
      'TELEGRAM_DEEP_LINK_FAILED','TELEGRAM_DEEP_LINK_ISSUED',
      'TELEGRAM_DEEP_LINK_REPLAYED','TELEGRAM_DEEP_LINK_VERIFIED',
      'TRUETEST','USER_CREATED','USER_DEACTIVATED','USER_DELETED',
      'USER_ROLE_UPDATED','USER_UPDATED','WORKER_HEARTBEAT'
    )
  );
