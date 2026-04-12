export type ProjectStage = 'development' | 'production'

export type ProjectStatus =
  | 'pago_recibido'
  | 'en_desarrollo'
  | 'esperando_feedback'
  | 'entregado'
  | 'entregado_sin_mantenimiento'
  | 'entregado_con_mantenimiento'

export interface OnboardingBrand {
  logo_url?: string
  isologo_url?: string
  favicon_url?: string
  brand_guide_url?: string
}

export interface OnboardingTypography {
  display_name?: string
  display_file_url?: string
  display_google_url?: string
  body_name?: string
  body_file_url?: string
  body_google_url?: string
  accent_name?: string
}

export interface OnboardingColor {
  name: string
  hex: string
}

export interface OnboardingReference {
  url?: string
  image_url?: string
  note?: string
}

export interface OnboardingPreviousSite {
  na?: boolean
  url?: string
  likes?: string
  dislikes?: string
}

export interface OnboardingContent {
  files?: Array<{ url: string; name: string }>
  notes?: string
}

export interface OnboardingBusiness {
  industry?: string
  audience?: string
  competitors?: string[]
  social?: Record<string, string>
  tone?: string
}

export interface OnboardingData {
  brand?: OnboardingBrand
  typography?: OnboardingTypography
  colors?: OnboardingColor[]
  references?: OnboardingReference[]
  previous_site?: OnboardingPreviousSite
  content?: OnboardingContent
  business?: OnboardingBusiness
}

export interface Profile {
  id: string
  role: 'admin' | 'client'
  name: string
  created_at: string
}

export interface Project {
  id: string
  client_user_id: string
  name: string
  framer_project_url: string
  framer_api_key_encrypted: string
  website_url?: string
  created_at: string
  stage: ProjectStage
  project_status: ProjectStatus
  onboarding_data: OnboardingData
  onboarding_complete: boolean
  admin_notes?: string
  meeting_file_url?: string
}

export interface ClientWithProject {
  id: string
  email: string
  role: 'admin' | 'client'
  name: string
  created_at: string
  project: Project | null
}

export type FramerFieldType =
  | 'string'
  | 'formattedText'
  | 'number'
  | 'date'
  | 'boolean'
  | 'color'
  | 'image'
  | 'file'
  | 'link'
  | 'enum'
  | 'array'

export interface FramerEnumCase {
  id: string
  name: string
}

export interface FramerField {
  id: string
  name: string
  type: FramerFieldType
  userEditable?: boolean
  required?: boolean
  cases?: FramerEnumCase[]
}

export interface FramerFieldValue {
  type: string
  value: unknown
  contentType?: 'markdown' | 'html'
}

export interface FramerItem {
  id: string
  slug: string
  draft?: boolean
  fieldData: Record<string, FramerFieldValue>
}

export interface FramerCollection {
  id: string
  name: string
}
