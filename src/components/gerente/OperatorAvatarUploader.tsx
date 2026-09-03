'use client';

import React, { useState } from 'react';
import { Camera, User, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadImageToStorage } from '@/lib/storage-utils';

interface OperatorAvatarUploaderProps {
  operatorId: string;
  currentAvatarUrl?: string | null;
  operatorName: string;
}

export function OperatorAvatarUploader({
  operatorId,
  currentAvatarUrl,
  operatorName
}: OperatorAvatarUploaderProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const cdnUrl = await uploadImageToStorage(file, 'avatars', 'operators');
      setAvatarUrl(cdnUrl);

      // Update in Supabase resources table with 50-byte CDN URL
      const { error } = await supabase
        .from('resources')
        .update({ avatar_url: cdnUrl })
        .eq('id', operatorId);

      if (error) throw error;
    } catch (err: any) {
      alert('Error al actualizar la foto: ' + (err?.message || err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group" title="Hacé clic en el ícono de cámara para cambiar la foto de perfil">
      <div className="w-20 h-20 rounded-2xl bg-zinc-900 flex items-center justify-center text-xl font-black text-white shrink-0 border-2 border-[#D4AF37] overflow-hidden shadow-md">
        {uploading ? (
          <Loader2 size={24} className="text-[#D4AF37] animate-spin" />
        ) : avatarUrl ? (
          <img src={avatarUrl} alt={operatorName} className="w-full h-full object-cover" />
        ) : (
          operatorName?.substring(0, 2).toUpperCase()
        )}
      </div>

      <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#D4AF37] hover:bg-[#b8972e] text-black rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
        <Camera size={14} />
        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
      </label>
    </div>
  );
}
