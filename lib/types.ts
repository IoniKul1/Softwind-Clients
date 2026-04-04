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
  created_at: string
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
  localeId?: string
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
