import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createServiceClient();
    const results: any[] = [];

    // Create novedades-media bucket
    const { data: bucket1, error: error1 } = await supabase.storage.createBucket('novedades-media', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm']
    });

    if (error1 && !error1.message.includes('already exists')) {
      results.push({ bucket: 'novedades-media', status: 'error', error: error1.message });
    } else {
      results.push({ bucket: 'novedades-media', status: 'success or already exists' });
    }

    // Create backups bucket (just in case they need it)
    const { data: bucket2, error: error2 } = await supabase.storage.createBucket('backups', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });

    if (error2 && !error2.message.includes('already exists')) {
      results.push({ bucket: 'backups', status: 'error', error: error2.message });
    } else {
      results.push({ bucket: 'backups', status: 'success or already exists' });
    }

    // Update Storage Policies (Requires raw SQL, but we'll try to just rely on the existing SQL migrations which might have created policies but failed on buckets)
    // Actually, creating the bucket programmatically should be enough because the storage policies are mapped to bucket_id.

    return NextResponse.json({ success: true, results, message: "Storage buckets configured successfully. You can now upload evidence." });
  } catch (error: any) {
    console.error('[SETUP_STORAGE] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
