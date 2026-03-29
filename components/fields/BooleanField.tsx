interface Props {
  fieldId: string
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

export function BooleanField({ label, value, onChange }: Props) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm">{label}</label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full transition ${value ? 'bg-white' : 'bg-neutral-700'}`}
      >
        <span className={`block w-4 h-4 rounded-full bg-black mx-1 transition-transform ${value ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  )
}
