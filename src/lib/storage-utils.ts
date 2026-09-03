import { supabase } from '@/lib/supabase';

/**
 * Compress an image file client-side to a max dimension and quality.
 * Reduces 4MB JPEGs to ~100KB-150KB without noticeable quality loss.
 */
export async function compressImage(file: File, maxDimension = 800, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // Fallback to raw file if canvas fails
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an image to Supabase Storage and return its public CDN URL.
 * Fallback to Base64 data URL ONLY if bucket upload fails or bucket is not accessible.
 */
export async function uploadImageToStorage(
  file: File,
  bucketName = 'avatars',
  folder = 'operators'
): Promise<string> {
  try {
    // 1. Compress image client-side first
    const compressedBlob = await compressImage(file, 800, 0.82);
    const fileExt = 'jpg';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    // 2. Upload blob to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, compressedBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.warn('[StorageUpload] Bucket upload warning:', uploadError.message);
      // Try fallback to reading compressed blob as data URL if bucket doesn't exist
      return await blobToBase64(compressedBlob);
    }

    // 3. Get Public CDN URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    if (publicUrlData?.publicUrl) {
      return publicUrlData.publicUrl;
    }

    return await blobToBase64(compressedBlob);
  } catch (err) {
    console.error('[StorageUpload] Error:', err);
    return await blobToBase64(file);
  }
}

function blobToBase64(blob: Blob | File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
