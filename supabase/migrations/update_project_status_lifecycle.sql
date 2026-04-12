-- Add onboarding_complete flag
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Expand project_status check constraint to include maintenance variants
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_project_status_check
  CHECK (project_status IN (
    'pago_recibido',
    'en_desarrollo',
    'esperando_feedback',
    'entregado',
    'entregado_sin_mantenimiento',
    'entregado_con_mantenimiento'
  ));
