interface Props {
  fieldId: string
  label: string
  value: string | null
  onChange: (value: string) => void
}

export function ColorField({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
        />
        <span className="text-sm font-mono text-neutral-400">{value ?? '#000000'}</span>
      </div>
    </div>
  )
}
