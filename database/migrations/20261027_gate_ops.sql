-- Gate operations settings table initial row if missing
INSERT INTO public.system_settings (id, value, updated_at)
VALUES ('gate_operations', '{"mode": "OPEN", "set_by": "system", "reason": "initial boot"}'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;
