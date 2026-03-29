interface Props {
  fieldId: string
  label: string
  value: string | null
  cases: string[]
  onChange: (value: string) => void
}

export function EnumField({ label, value, cases, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm outline-none focus:border-neutral-500 transition"
      >
        <option value="">— Seleccioná —</option>
        {cases.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}
