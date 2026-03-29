interface Props {
  fieldId: string
  label: string
  value: number | null
  onChange: (value: number) => void
}

export function NumberField({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
      />
    </div>
  )
}
