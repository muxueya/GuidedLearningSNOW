'use client'
import { useRef, useState } from 'react'
import { useSessionStore } from '@/store/session'

interface UploadResult {
  documentId: number
  title: string
  pageCount: number
  charCount: number
}

export function PdfUpload() {
  const { documentId, documentTitle, setDocument, clearDocument } = useSessionStore()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported')
      return
    }
    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json() as UploadResult & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setDocument(data.documentId, data.title)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (documentId) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-900/40 border border-indigo-700/50 text-sm max-w-md w-full">
        <span className="text-indigo-300 text-base">📄</span>
        <span className="text-white truncate flex-1">{documentTitle}</span>
        <button
          onClick={clearDocument}
          className="text-gray-400 hover:text-white transition-colors ml-1 shrink-0"
          aria-label="Remove document"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border border-dashed border-white/20 hover:border-indigo-400/60 bg-white/5 hover:bg-white/8 cursor-pointer transition-colors text-center"
      >
        {uploading ? (
          <>
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Parsing PDF…</span>
          </>
        ) : (
          <>
            <span className="text-2xl">📄</span>
            <span className="text-sm text-gray-400">
              Upload a PDF — book, slides, or course notes
            </span>
            <span className="text-xs text-gray-600">Click or drag & drop · max 50 MB</span>
          </>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  )
}
