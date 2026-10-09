SET check_function_bodies = off;

DROP TRIGGER IF EXISTS trg_audit_on_pass_insert ON public.gate_passes;
CREATE TRIGGER trg_audit_on_pass_insert AFTER INSERT ON public.gate_passes FOR EACH ROW EXECUTE FUNCTION create_audit_log_on_pass_insert();

DROP TRIGGER IF EXISTS trg_audit_on_pass_update ON public.gate_passes;
CREATE TRIGGER trg_audit_on_pass_update AFTER UPDATE ON public.gate_passes FOR EACH ROW EXECUTE FUNCTION create_audit_log_on_pass_update();

DROP TRIGGER IF EXISTS trg_audit_on_movement ON public.movement_logs;
CREATE TRIGGER trg_audit_on_movement AFTER INSERT ON public.movement_logs FOR EACH ROW EXECUTE FUNCTION create_audit_log_on_movement();

DROP TRIGGER IF EXISTS trg_daily_stats_on_movement ON public.movement_logs;
CREATE TRIGGER trg_daily_stats_on_movement AFTER INSERT ON public.movement_logs FOR EACH ROW EXECUTE FUNCTION update_daily_stats_on_movement();

DROP TRIGGER IF EXISTS trg_occupancy_on_movement ON public.movement_logs;
CREATE TRIGGER trg_occupancy_on_movement AFTER INSERT ON public.movement_logs FOR EACH ROW EXECUTE FUNCTION update_campus_occupancy_on_movement();

DROP TRIGGER IF EXISTS trg_notif_prefs_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_notif_prefs_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_audit_on_user_change ON public.users;
CREATE TRIGGER trg_audit_on_user_change AFTER INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION create_audit_log_on_user_change();

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

