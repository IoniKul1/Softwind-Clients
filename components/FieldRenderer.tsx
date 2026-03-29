'use client'

import type { FramerField, FramerFieldValue } from '@/lib/types'
import { StringField } from './fields/StringField'
import { NumberField } from './fields/NumberField'
import { DateField } from './fields/DateField'
import { BooleanField } from './fields/BooleanField'
import { ColorField } from './fields/ColorField'
import { LinkField } from './fields/LinkField'
import { EnumField } from './fields/EnumField'
import { FormattedTextField } from './fields/FormattedTextField'
import { ImageField } from './fields/ImageField'
import { FileField } from './fields/FileField'
import { GalleryField } from './fields/GalleryField'

interface Props {
  field: FramerField
  value: FramerFieldValue | undefined
  onChange: (fieldId: string, value: FramerFieldValue) => void
}

export function FieldRenderer({ field, value, onChange }: Props) {
  const v = value?.value

  switch (field.type) {
    case 'string':
      return (
        <StringField
          fieldId={field.id}
          label={field.name}
          value={v as string ?? null}
          onChange={(val) => onChange(field.id, { type: 'string', value: val })}
        />
      )
    case 'number':
      return (
        <NumberField
          fieldId={field.id}
          label={field.name}
          value={v as number ?? null}
          onChange={(val) => onChange(field.id, { type: 'number', value: val })}
        />
      )
    case 'date':
      return (
        <DateField
          fieldId={field.id}
          label={field.name}
          value={v as string ?? null}
          onChange={(val) => onChange(field.id, { type: 'date', value: val })}
        />
      )
    case 'boolean':
      return (
        <BooleanField
          fieldId={field.id}
          label={field.name}
          value={!!(v)}
          onChange={(val) => onChange(field.id, { type: 'boolean', value: val })}
        />
      )
    case 'color':
      return (
        <ColorField
          fieldId={field.id}
          label={field.name}
          value={v as string ?? null}
          onChange={(val) => onChange(field.id, { type: 'color', value: val })}
        />
      )
    case 'link':
      return (
        <LinkField
          fieldId={field.id}
          label={field.name}
          value={v as any ?? null}
          onChange={(val) => onChange(field.id, { type: 'link', value: val })}
        />
      )
    case 'enum':
      return (
        <EnumField
          fieldId={field.id}
          label={field.name}
          value={v as string ?? null}
          cases={field.cases ?? []}
          onChange={(val) => onChange(field.id, { type: 'enum', value: val })}
        />
      )
    case 'formattedText':
      return (
        <FormattedTextField
          fieldId={field.id}
          label={field.name}
          value={v as string ?? null}
          onChange={(val, ct) => onChange(field.id, { type: 'formattedText', value: val, contentType: ct })}
        />
      )
    case 'image':
      return (
        <ImageField
          fieldId={field.id}
          label={field.name}
          value={v as any ?? null}
          onChange={(val) => onChange(field.id, { type: 'image', value: val })}
        />
      )
    case 'file':
      return (
        <FileField
          fieldId={field.id}
          label={field.name}
          value={v as any ?? null}
          onChange={(val) => onChange(field.id, { type: 'file', value: val })}
        />
      )
    case 'array':
      return (
        <GalleryField
          fieldId={field.id}
          label={field.name}
          value={v as any ?? null}
          onChange={(val) => onChange(field.id, { type: 'array', value: val })}
        />
      )
    default:
      return <p className="text-xs text-neutral-500">Campo tipo "{field.type}" no soportado</p>
  }
}
