interface Attachment {
  url: string
  name: string
  type: 'image' | 'file'
}

export default function AttachmentPreview({ attachments }: { attachments: Attachment[] }) {
  if (!attachments?.length) return null
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {attachments.map((a, i) =>
        a.type === 'image' ? (
          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
            <img
              src={a.url}
              alt={a.name}
              className="w-16 h-16 object-cover rounded-lg border border-neutral-800 hover:border-neutral-600 transition"
            />
          </a>
        ) : (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-800 hover:border-neutral-600 transition text-xs text-neutral-400"
          >
            <span>📄</span>
            <span className="max-w-[120px] truncate">{a.name}</span>
          </a>
        )
      )}
    </div>
  )
}
