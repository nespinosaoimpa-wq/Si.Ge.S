import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/upload
 * Accepts multipart/form-data with a single `file` field.
 * Uploads to Supabase Storage bucket `novedades-media`.
 * Returns { url: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = createServiceClient()
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    // Validate size (max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo supera el límite de 10 MB' }, { status: 413 })
    }

    // Build unique storage path: <type>/<timestamp>-<random>.<ext>
    const ext = file.name.split('.').pop() ?? 'bin'
    const isAudio = file.type.startsWith('audio/')
    const folder = isAudio ? 'audios' : 'imagenes'
    const timestamp = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)
    const storagePath = `${folder}/${timestamp}-${rand}.${ext}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('novedades-media')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[UPLOAD] Storage error:', uploadError)
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('novedades-media')
      .getPublicUrl(storagePath)

    return NextResponse.json({ url: urlData.publicUrl, path: storagePath })
  } catch (error: any) {
    console.error('[UPLOAD] Error:', error)
    return NextResponse.json({ error: error.message ?? 'Error al subir archivo' }, { status: 500 })
  }
}
