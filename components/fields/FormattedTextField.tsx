'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface Props {
  fieldId: string
  label: string
  value: string | null
  onChange: (value: string, contentType: 'html') => void
}

export function FormattedTextField({ label, value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value ?? '',
    onUpdate: ({ editor }) => onChange(editor.getHTML(), 'html'),
  })

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm min-h-[120px] prose prose-invert prose-sm max-w-none focus-within:border-neutral-500 transition">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
