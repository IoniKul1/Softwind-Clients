'use client'
import type { OnboardingData } from '@/lib/types'

function DownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-indigo-400 hover:underline"
      aria-label={label}
    >
      Descargar
    </a>
  )
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-neutral-400 hover:text-neutral-200 underline"
    >
      {children}
    </a>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-neutral-500">{label}</span>
      <div className="text-sm text-neutral-200">{children}</div>
    </div>
  )
}

function BrandViewer({ data }: { data: OnboardingData['brand'] }) {
  if (!data) return null
  const items = [
    { key: 'logo_url' as const, label: 'Logo', ariaLabel: 'Descargar logo' },
    { key: 'isologo_url' as const, label: 'Isologo', ariaLabel: 'Descargar isologo' },
    { key: 'favicon_url' as const, label: 'Favicon', ariaLabel: 'Descargar favicon' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        {items.map(({ key, label, ariaLabel }) => {
          const url = data[key]
          if (!url) return null
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <span className="text-xs text-neutral-500">{label}</span>
              <img
                src={url}
                alt={label}
                className="h-16 w-auto max-w-[120px] object-contain rounded-md border border-neutral-700 bg-neutral-800 p-1"
              />
              <DownloadLink href={url} label={ariaLabel} />
            </div>
          )
        })}
      </div>
      {data.brand_guide_url && (
        <Field label="Guía de marca">
          <DownloadLink href={data.brand_guide_url} label="Descargar guía de marca" />
        </Field>
      )}
    </div>
  )
}

function TypographyViewer({ data }: { data: OnboardingData['typography'] }) {
  if (!data) return null
  const rows = [
    {
      label: 'Tipografía principal',
      name: data.display_name,
      fileUrl: data.display_file_url,
      googleUrl: data.display_google_url,
    },
    {
      label: 'Tipografía de texto',
      name: data.body_name,
      fileUrl: data.body_file_url,
      googleUrl: data.body_google_url,
    },
    {
      label: 'Tipografía de acento',
      name: data.accent_name,
      fileUrl: undefined,
      googleUrl: undefined,
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      {rows.map(({ label, name, fileUrl, googleUrl }) => {
        if (!name) return null
        return (
          <Field key={label} label={label}>
            <span>{name}</span>
            {fileUrl && (
              <span className="ml-2">
                <a
                  href={fileUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:underline"
                  aria-label="Descargar archivo"
                >
                  Descargar archivo
                </a>
              </span>
            )}
            {googleUrl && (
              <span className="ml-2">
                <ExternalLink href={googleUrl}>Ver en Google Fonts ↗</ExternalLink>
              </span>
            )}
          </Field>
        )
      })}
    </div>
  )
}

function ColorsViewer({ data }: { data: OnboardingData['colors'] }) {
  if (!data || data.length === 0) return null
  return (
    <div className="flex flex-wrap gap-3">
      {data.map((color, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded border border-neutral-700 shrink-0"
            style={{ backgroundColor: color.hex }}
          />
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-neutral-300">{color.name}</span>
            <span className="text-xs text-neutral-500 font-mono">{color.hex}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ReferencesViewer({ data }: { data: OnboardingData['references'] }) {
  if (!data || data.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      {data.map((ref, i) => (
        <div key={i} className="flex gap-3 items-start">
          {ref.image_url && (
            <img
              src={ref.image_url}
              alt={ref.note ?? `Referencia ${i + 1}`}
              className="h-16 w-24 object-cover rounded border border-neutral-700 shrink-0"
            />
          )}
          <div className="flex flex-col gap-1 min-w-0">
            {ref.image_url && (
              <DownloadLink href={ref.image_url} label={`Descargar referencia ${i + 1}`} />
            )}
            {!ref.image_url && ref.url && (
              <ExternalLink href={ref.url}>
                {ref.url.length > 50 ? ref.url.slice(0, 50) + '…' : ref.url}
              </ExternalLink>
            )}
            {ref.note && <span className="text-xs text-neutral-500">{ref.note}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function PreviousSiteViewer({ data }: { data: OnboardingData['previous_site'] }) {
  if (!data) return null
  if (data.na) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-neutral-800 text-neutral-400">
        Sin sitio web anterior
      </span>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {data.url && (
        <Field label="URL del sitio anterior">
          <ExternalLink href={data.url}>{data.url}</ExternalLink>
        </Field>
      )}
      {data.likes && <Field label="Qué le gusta">{data.likes}</Field>}
      {data.dislikes && <Field label="Qué no le gusta">{data.dislikes}</Field>}
    </div>
  )
}

function ContentViewer({ data }: { data: OnboardingData['content'] }) {
  if (!data) return null
  return (
    <div className="flex flex-col gap-3">
      {data.files && data.files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-neutral-500">Archivos</span>
          {data.files.map((file, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-neutral-300 truncate">{file.name}</span>
              <a
                href={file.url}
                download={file.name}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:underline shrink-0"
                aria-label={`Descargar ${file.name}`}
              >
                Descargar
              </a>
            </div>
          ))}
        </div>
      )}
      {data.notes && <Field label="Notas">{data.notes}</Field>}
    </div>
  )
}

function BusinessViewer({ data }: { data: OnboardingData['business'] }) {
  if (!data) return null
  return (
    <div className="flex flex-col gap-3">
      {data.industry && <Field label="Industria">{data.industry}</Field>}
      {data.audience && <Field label="Audiencia objetivo">{data.audience}</Field>}
      {data.tone && <Field label="Tono de comunicación">{data.tone}</Field>}
      {data.competitors && data.competitors.length > 0 && (
        <Field label="Competidores">
          <div className="flex flex-wrap gap-1.5">
            {data.competitors.map((c, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                {c}
              </span>
            ))}
          </div>
        </Field>
      )}
      {data.social && Object.keys(data.social).length > 0 && (
        <Field label="Redes sociales">
          <div className="flex flex-col gap-1">
            {Object.entries(data.social).map(([platform, value]) => (
              <div key={platform} className="flex gap-2 items-center">
                <span className="text-xs text-neutral-500 w-20 shrink-0">{platform}</span>
                {value.startsWith('http') ? (
                  <ExternalLink href={value}>{value}</ExternalLink>
                ) : (
                  <span className="text-sm text-neutral-300">{value}</span>
                )}
              </div>
            ))}
          </div>
        </Field>
      )}
    </div>
  )
}

interface Props {
  sectionKey: keyof OnboardingData
  data: OnboardingData[keyof OnboardingData]
}

export default function OnboardingSectionViewer({ sectionKey, data }: Props) {
  if (!data) return null

  switch (sectionKey) {
    case 'brand':
      return <BrandViewer data={data as OnboardingData['brand']} />
    case 'typography':
      return <TypographyViewer data={data as OnboardingData['typography']} />
    case 'colors':
      return <ColorsViewer data={data as OnboardingData['colors']} />
    case 'references':
      return <ReferencesViewer data={data as OnboardingData['references']} />
    case 'previous_site':
      return <PreviousSiteViewer data={data as OnboardingData['previous_site']} />
    case 'content':
      return <ContentViewer data={data as OnboardingData['content']} />
    case 'business':
      return <BusinessViewer data={data as OnboardingData['business']} />
    default:
      return null
  }
}
