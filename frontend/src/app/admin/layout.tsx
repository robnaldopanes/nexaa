'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, removeToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const apiUrl = getApiUrl();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // No proteger la página de login ni la raíz de admin (que redirige)
    if (pathname === '/admin/login' || pathname === '/admin') {
      setChecking(false);
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    // Verificar token con el backend
    fetch(`${apiUrl}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Token inválido');
        return res.json();
      })
      .then(() => {
        setChecking(false);
      })
      .catch(() => {
        removeToken();
        router.replace('/admin/login');
      });
  }, [pathname, router, apiUrl]);

  const handleLogout = () => {
    removeToken();
    router.replace('/admin/login');
  };

  const isProtected = pathname !== '/admin/login' && pathname !== '/admin';

  if (checking && isProtected) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-secondary text-[48px]">progress_activity</span>
          <p className="text-body-lg text-on-surface-variant mt-3">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isProtected && (
        <div className="bg-surface-container-lowest border-b border-outline-variant/30 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">admin_panel_settings</span>
            <span className="text-label-md font-bold text-primary">NEXAA Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant rounded-lg text-label-sm text-on-surface-variant hover:bg-error/10 hover:text-error hover:border-error/30 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      )}
      {children}
    </>
  );
}
