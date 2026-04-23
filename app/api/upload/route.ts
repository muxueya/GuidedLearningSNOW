import { NextRequest, NextResponse } from 'next/server'
import { getDb, saveDocument } from '@/lib/db'
import { PDFParse } from 'pdf-parse'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!file.type.includes('pdf')) {
    return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 400 })
  }

  const filename = (file as File).name ?? 'upload.pdf'

  let content: string
  let pageCount: number
  let pdfTitle: string | undefined
  try {
    const arrayBuffer = await file.arrayBuffer()
    const parser = new PDFParse({ data: arrayBuffer })
    const [textResult, infoResult] = await Promise.all([
      parser.getText(),
      parser.getInfo(),
    ])
    await parser.destroy()
    content = textResult.text.trim()
    pageCount = textResult.total
    pdfTitle = (infoResult.info?.Title as string | undefined)?.trim() || undefined
  } catch {
    return NextResponse.json({ error: 'Failed to parse PDF — make sure it is a valid, text-based PDF' }, { status: 422 })
  }

  if (!content) {
    return NextResponse.json({ error: 'PDF appears to contain no extractable text (it may be image-based)' }, { status: 422 })
  }

  const title = pdfTitle || filename.replace(/\.pdf$/i, '')

  try {
    const db = getDb()
    const documentId = saveDocument(db, { filename, title, pageCount, content })
    return NextResponse.json({ documentId, title, pageCount, charCount: content.length }, { status: 201 })
  } catch (err) {
    console.error('Failed to save document:', err)
    return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
  }
}
