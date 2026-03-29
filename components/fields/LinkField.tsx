interface LinkValue {
  url: string
  label?: string
}

interface Props {
  fieldId: string
  label: string
  value: LinkValue | null
  onChange: (value: LinkValue) => void
}

export function LinkField({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <input
        type="url"
        placeholder="https://..."
        value={value?.url ?? ''}
        onChange={(e) => onChange({ ...value, url: e.target.value })}
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
      />
      <input
        type="text"
        placeholder="Texto del link (opcional)"
        value={value?.label ?? ''}
        onChange={(e) => onChange({ ...value, url: value?.url ?? '', label: e.target.value })}
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-neutral-500 transition"
      />
    </div>
  )
}
