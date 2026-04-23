import { NextRequest, NextResponse } from 'next/server'
import { getQrKey, getQrImage, checkQrStatus, saveCookie } from '@/lib/music'

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')
  if (action === 'qr') {
    const key = await getQrKey()
    const qrimg = await getQrImage(key)
    return NextResponse.json({ key, qrimg })
  }
  if (action === 'check') {
    const key = req.nextUrl.searchParams.get('key') ?? ''
    const { status, cookie } = await checkQrStatus(key)
    if (status === 803 && cookie) saveCookie(cookie)
    return NextResponse.json({ status })
  }
  return NextResponse.json({ error: 'invalid action' }, { status: 400 })
}
