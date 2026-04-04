'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Link from '@tiptap/extension-link'
import { useCallback, useRef } from 'react'

interface Props {
  fieldId: string
  label: string
  value: string | null
  onChange: (value: string, contentType: 'html') => void
}

function ToolbarButton({ onClick, active, title, children }: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={`px-2 py-1 rounded text-xs font-medium transition ${
        active
          ? 'bg-white/15 text-white'
          : 'text-neutral-400 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="w-px h-4 bg-neutral-700 mx-0.5 shrink-0" />
}

export function FormattedTextField({ label, value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false }),
    ],
    content: value ?? '',
    onUpdate: ({ editor }) => onChange(editor.getHTML(), 'html'),
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[200px] prose prose-invert prose-sm max-w-none',
      },
    },
  })

  const addLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href ?? ''
    const url = window.prompt('URL del link', prev)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  const addImageFromUrl = useCallback(() => {
    if (!editor) return
    const url = window.prompt('URL de la imagen')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  const addImageFromFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result as string }).run()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [editor])

  const addTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-400">{label}</label>

      <div className="border border-neutral-700 rounded-lg overflow-hidden focus-within:border-neutral-500 transition">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-neutral-800 bg-neutral-900">
          {/* Text format */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita">
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálica">
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado">
            <s>S</s>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código inline">
            {'<>'}
          </ToolbarButton>

          <Divider />

          {/* Headings */}
          {([1, 2, 3] as const).map(level => (
            <ToolbarButton
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              active={editor.isActive('heading', { level })}
              title={`Título ${level}`}
            >
              H{level}
            </ToolbarButton>
          ))}

          <Divider />

          {/* Lists */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
            ≡
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
            1≡
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Cita">
            "
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Bloque de código">
            {'{ }'}
          </ToolbarButton>

          <Divider />

          {/* Link */}
          <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Link">
            🔗
          </ToolbarButton>

          {/* Image */}
          <ToolbarButton onClick={addImageFromUrl} title="Imagen (URL)">
            🖼
          </ToolbarButton>
          <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Imagen (archivo)">
            📁
          </ToolbarButton>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={addImageFromFile} />

          {/* Table */}
          <ToolbarButton onClick={addTable} title="Insertar tabla">
            ⊞
          </ToolbarButton>
          {editor.isActive('table') && (
            <>
              <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Agregar columna">+col</ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Agregar fila">+fila</ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Eliminar tabla">✕tabla</ToolbarButton>
            </>
          )}

          <Divider />

          {/* History */}
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Deshacer">↩</ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Rehacer">↪</ToolbarButton>
        </div>

        {/* Editor area */}
        <div className="bg-neutral-950 px-4 py-3 text-sm">
          <EditorContent editor={editor} />
        </div>
      </div>

      <style>{`
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .ProseMirror td, .ProseMirror th { border: 1px solid #404040; padding: 6px 10px; min-width: 80px; }
        .ProseMirror th { background: #1a1a1a; font-weight: 600; }
        .ProseMirror img { max-width: 100%; border-radius: 6px; margin: 0.5em 0; }
        .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #555; pointer-events: none; float: left; height: 0; }
      `}</style>
    </div>
  )
}
