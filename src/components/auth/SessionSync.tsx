'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionSync() {
  const router = useRouter();

  useEffect(() => {
    const checkTempAuth = () => {
      // Find the SIGPAD_auth_temp cookie
      const cookies = document.cookie.split('; ');
      const tempAuthCookie = cookies.find(row => row.startsWith('SIGPAD_auth_temp='));

      if (tempAuthCookie) {
        try {
          const rawData = decodeURIComponent(tempAuthCookie.split('=')[1]);
          const userData = JSON.parse(rawData);

          if (userData && userData.id) {
            console.log('[Auth Sync] Migrating OAuth session to localStorage...');
            localStorage.setItem('SIGPAD_user', JSON.stringify(userData));
            
            // Delete the temp cookie by setting expiry in the past
            document.cookie = "SIGPAD_auth_temp=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            
            // Refresh to ensure all components see the new localStorage state
            window.location.reload();
          }
        } catch (e) {
          console.error('[Auth Sync] Error parsing temporary auth data:', e);
        }
      }
    };

    checkTempAuth();
  }, [router]);

  return null;
}
