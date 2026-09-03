import { supabase } from './supabase';

/**
 * Direct Browser-to-Supabase Storage Uploader (0 Vercel Origin Bytes)
 * Uploads evidence, photos, and audio files directly to Supabase Storage.
 */
export async function uploadMediaDirect(file: Blob, filename?: string): Promise<{ url: string; path: string }> {
  const isAudio = file.type.startsWith('audio/');
  const folder = isAudio ? 'audios' : 'imagenes';
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const ext = (filename || 'file').split('.').pop() || (isAudio ? 'mp3' : 'jpg');
  const storagePath = `${folder}/${timestamp}-${rand}.${ext}`;

  // Try bucket 'novedades-media'
  const { error: uploadError } = await supabase.storage
    .from('novedades-media')
    .upload(storagePath, file, {
      contentType: file.type || (isAudio ? 'audio/mpeg' : 'image/jpeg'),
      upsert: true
    });

  if (uploadError) {
    // Fallback to bucket 'evidence' or 'digital_evidence'
    const { error: fbErr } = await supabase.storage
      .from('evidence')
      .upload(storagePath, file, {
        contentType: file.type || (isAudio ? 'audio/mpeg' : 'image/jpeg'),
        upsert: true
      });

    if (fbErr) {
      console.error('[StorageDirect] Upload error:', uploadError, fbErr);
      throw uploadError;
    }

    const { data: pubData } = supabase.storage.from('evidence').getPublicUrl(storagePath);
    return { url: pubData.publicUrl, path: storagePath };
  }

  const { data: pubData } = supabase.storage.from('novedades-media').getPublicUrl(storagePath);
  return { url: pubData.publicUrl, path: storagePath };
}
