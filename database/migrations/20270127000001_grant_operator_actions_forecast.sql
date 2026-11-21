-- infra_forecaster (worker) runs as gate_app and INSERTs operator_actions
-- rows for auto/notify forecast breaches. It needs explicit privileges.
GRANT INSERT, SELECT ON public.operator_actions TO gate_app;
