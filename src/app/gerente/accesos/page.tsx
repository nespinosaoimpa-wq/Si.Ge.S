'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToPersonal() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/gerente/personal');
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-zinc-200 border-t-[#0F4C5C] rounded-full animate-spin" />
    </div>
  );
}
