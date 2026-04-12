-- supabase/migrations/add_client_stages.sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'development'
    CHECK (stage IN ('development', 'production')),
  ADD COLUMN IF NOT EXISTS project_status text NOT NULL DEFAULT 'pago_recibido'
    CHECK (project_status IN ('pago_recibido', 'en_desarrollo', 'esperando_feedback', 'entregado')),
  ADD COLUMN IF NOT EXISTS onboarding_data jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS meeting_file_url text;
