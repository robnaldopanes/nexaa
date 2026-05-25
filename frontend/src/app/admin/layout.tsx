'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SIDEBAR_ITEMS = [
  { href: '/admin/dashboard', icon: 'dashboard', label: 'Panel' },
  { href: '/admin/inbox', icon: 'inbox', label: 'Inbox RSS' },
  { href: '/admin/noticias', icon: 'newspaper', label: 'Noticias' },
  { href: '/admin/fotos', icon: 'collections', label: 'Fotografías' },
  { href: '/admin/publicidad', icon: 'campaign', label: 'Publicidad' },
  { href: '/admin/estadisticas', icon: 'analytics', label: 'Estadísticas' },
  { href: '/admin/ia-demo', icon: 'auto_awesome', label: 'Demo IA' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex w-full overflow-x-hidden min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 min-h-screen fixed left-0 top-0 p-gutter bg-surface-container-lowest border-r border-outline-variant z-50">
          <div className="mb-stack-lg px-2">
            <Link href="/admin/dashboard">
              <span className="text-headline-md font-headline-md text-primary">NEXAA Admin</span>
            </Link>
          </div>

          <nav className="flex-1 space-y-2">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-secondary-container text-on-secondary-container font-bold'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="text-label-md font-label-md">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-stack-md border-t border-outline-variant">
            <Link
              href="/admin/login"
              className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-error transition-colors"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="text-label-md font-label-md">Cerrar sesión</span>
            </Link>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="lg:hidden fixed top-0 left-0 w-full z-40 bg-surface-container-lowest h-14 border-b border-outline-variant flex items-center justify-between px-margin-mobile">
          <Link href="/admin/dashboard">
            <span className="text-headline-md font-headline-md text-primary">NEXAA Admin</span>
          </Link>
          <Link href="/" className="text-label-md text-secondary">
            Ver sitio
          </Link>
        </header>

        {/* Mobile bottom nav for admin */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-gutter py-2 bg-surface-container-lowest/80 backdrop-blur-md border-t border-outline-variant/30 rounded-t-xl">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center ${
                  isActive ? 'text-secondary' : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 lg:ml-64 p-margin-mobile lg:p-margin-desktop pt-14 lg:pt-margin-desktop pb-20 lg:pb-margin-desktop min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
