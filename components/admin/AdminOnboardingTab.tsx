// components/admin/AdminOnboardingTab.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import ProjectStatusSelector from './ProjectStatusSelector'
import { ONBOARDING_SECTIONS, isSectionComplete } from '@/lib/onboarding'
import type { ProjectStatus, ProjectStage, OnboardingData } from '@/lib/types'

interface ProjectData {
  id: string
  stage: ProjectStage
  project_status: ProjectStatus
  onboarding_data: OnboardingData
  admin_notes?: string
  meeting_file_url?: string
}

interface Props {
  clientId: string
  project: ProjectData
}

export default function AdminOnboardingTab({ clientId, project }: Props) {
  const [status, setStatus] = useState<ProjectStatus>(project.project_status)
  const [stage, setStage] = useState<ProjectStage>(project.stage)
  const [adminNotes, setAdminNotes] = useState(project.admin_notes ?? '')
  const [meetingFileUrl, setMeetingFileUrl] = useState(project.meeting_file_url ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [savedNotes, setSavedNotes] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [uploadingMeeting, setUploadingMeeting] = useState(false)
  const [meetingError, setMeetingError] = useState<string | null>(null)
  const savedNotesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const data = project.onboarding_data

  useEffect(() => {
    return () => {
      if (savedNotesTimer.current) clearTimeout(savedNotesTimer.current)
    }
  }, [])

  async function saveAdminNotes() {
    setSavingNotes(true)
    setSavedNotes(false)
    setNotesError(null)
    if (savedNotesTimer.current) clearTimeout(savedNotesTimer.current)
    try {
      const res = await fetch('/api/project-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, admin_notes: adminNotes }),
      })
      if (!res.ok) throw new Error('Error al guardar notas')
      setSavedNotes(true)
      savedNotesTimer.current = setTimeout(() => setSavedNotes(false), 3000)
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSavingNotes(false)
    }
  }

  async function handleMeetingUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const MAX_BYTES = 50 * 1024 * 1024 // 50 MB
    if (file.size > MAX_BYTES) {
      setMeetingError('El archivo supera el límite de 50 MB')
      return
    }
    setUploadingMeeting(true)
    setMeetingError(null)
    try {
      const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
      if (!r2Url) throw new Error('NEXT_PUBLIC_R2_PUBLIC_URL no está configurado')
      const contentType = file.type || 'application/octet-stream'
      const ext = file.name.split('.').pop() ?? 'bin'
      const key = `onboarding/admin/${clientId}/meeting/${Date.now()}.${ext}`
      const res = await fetch(`/api/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}`)
      if (!res.ok) throw new Error('Error al obtener URL de subida')
      const { url } = await res.json()
      const uploadRes = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } })
      if (!uploadRes.ok) throw new Error('Error al subir archivo')
      const publicUrl = `${r2Url}/${key}`
      setMeetingFileUrl(publicUrl)
      const saveRes = await fetch('/api/project-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, meeting_file_url: publicUrl }),
      })
      if (!saveRes.ok) throw new Error('Error al guardar URL del archivo')
    } catch (err) {
      setMeetingError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setUploadingMeeting(false)
    }
  }

  const completed = ONBOARDING_SECTIONS.filter(s => isSectionComplete(data, s.key)).length

  return (
    <div className="flex flex-col gap-8 max-w-3xl">

      {/* Status Control */}
      <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
        <h2 className="text-sm font-semibold text-white mb-4">Control de Estado</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ProjectStatusSelector
            clientId={clientId}
            currentStatus={status}
            currentStage={stage}
            onUpdate={(s, g) => { setStatus(s); setStage(g) }}
          />
          <div>
            <p className="text-xs text-neutral-400 mb-2">Etapa actual</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              stage === 'development'
                ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-800'
                : 'bg-green-900/50 text-green-400 border border-green-800'
            }`}>
              {stage === 'development' ? 'Desarrollo' : 'Producción'}
            </span>
          </div>
        </div>
      </div>

      {/* Client Onboarding Progress */}
      <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Información del Cliente</h2>
          <span className="text-xs text-neutral-500">{completed} de {ONBOARDING_SECTIONS.length} secciones</span>
        </div>
        <div className="h-1.5 bg-neutral-800 rounded-full mb-5 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full"
            style={{ width: `${Math.round((completed / ONBOARDING_SECTIONS.length) * 100)}%` }}
          />
        </div>
        <div className="flex flex-col gap-3">
          {ONBOARDING_SECTIONS.map(({ key, label }) => {
            const done = isSectionComplete(data, key)
            const sectionData = data[key]
            return (
              <div key={key} className={`p-3 rounded-lg border ${done ? 'border-neutral-700 bg-neutral-800/50' : 'border-neutral-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-300">{label}</span>
                  <span className={`text-xs ${done ? 'text-green-400' : 'text-neutral-600'}`}>
                    {done ? '✓ Completado' : 'Pendiente'}
                  </span>
                </div>
                {done && sectionData && (
                  <pre className="text-xs text-neutral-500 overflow-auto max-h-24 whitespace-pre-wrap">
                    {JSON.stringify(sectionData, null, 2)}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Admin-only: Meeting Transcript */}
      <div className="bg-indigo-950/30 rounded-xl p-6 border border-indigo-900">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded font-medium">Solo Admin</span>
          <h2 className="text-sm font-semibold text-white">Transcript de Reunión</h2>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Archivo de reunión (PDF, DOCX, TXT, MP3)</label>
            {meetingFileUrl && (
              <a href={meetingFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline block mb-2">
                Ver archivo actual ↗
              </a>
            )}
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.mp3,.mp4"
              onChange={handleMeetingUpload}
              disabled={uploadingMeeting}
              className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-neutral-800 file:text-neutral-200 file:text-xs hover:file:bg-neutral-700 transition disabled:opacity-50"
            />
            {uploadingMeeting && <p className="text-xs text-neutral-500 mt-1">Subiendo...</p>}
            {meetingError && <p className="text-xs text-red-400 mt-1">{meetingError}</p>}
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Notas internas</label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={5}
              className="w-full bg-neutral-800 text-white text-sm px-3 py-2 rounded-lg border border-neutral-700 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Notas de la reunión, acuerdos, puntos importantes..."
            />
          </div>
          <button
            onClick={saveAdminNotes}
            disabled={savingNotes}
            className="self-start px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {savingNotes ? 'Guardando...' : 'Guardar notas'}
          </button>
          {savedNotes && <p className="text-xs text-green-400">✓ Guardado</p>}
          {notesError && <p className="text-xs text-red-400">{notesError}</p>}
        </div>
      </div>

    </div>
  )
}
