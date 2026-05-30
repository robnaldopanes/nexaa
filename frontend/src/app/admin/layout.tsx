'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Toaster } from 'sonner';
import { getToken, removeToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Panel', icon: 'dashboard' },
  { href: '/admin/noticias', label: 'Noticias', icon: 'newspaper' },
  { href: '/admin/inbox', label: 'Inbox RSS', icon: 'rss_feed' },
  { href: '/admin/fotos', label: 'Fotos', icon: 'photo_camera' },
  { href: '/admin/publicidad', label: 'Publicidad', icon: 'campaign' },
  { href: '/admin/estadisticas', label: 'Estadísticas', icon: 'bar_chart' },
  { href: '/admin/ia-demo', label: 'IA Demo', icon: 'auto_awesome' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const apiUrl = getApiUrl();
  const [checking, setChecking] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  // Login o redirect: solo renderizar children sin sidebar
  if (!isProtected) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      <Toaster position="top-right" richColors closeButton />
      {/* Sidebar desktop / Mobile overlay */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-surface-container-lowest border-r border-outline-variant/30 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="px-5 py-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">admin_panel_settings</span>
            <span className="text-title-md font-bold text-primary">NEXAA Admin</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden p-1 text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-label-md font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-outline-variant/30">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-label-md font-medium text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden bg-surface-container-lowest border-b border-outline-variant/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">admin_panel_settings</span>
            <span className="text-label-md font-bold text-primary">NEXAA Admin</span>
          </div>
          <button onClick={() => setMobileOpen(true)} className="p-1 text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>

        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
