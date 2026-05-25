'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', icon: 'home', label: 'Inicio' },
  { href: '/fotos', icon: 'grid_view', label: 'Fotos' },
  { href: '/buscar', icon: 'search', label: 'Buscar' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex md:hidden justify-around items-center px-gutter py-2 pb-safe bg-surface-container-lowest/80 backdrop-blur-md border-t border-outline-variant/30 rounded-t-xl shadow-lg">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center transition-colors duration-150 active:scale-90 ${
              isActive
                ? 'text-secondary after:block after:w-1 after:h-1 after:bg-secondary after:rounded-full after:mt-1'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span
              className={`material-symbols-outlined ${isActive ? 'material-symbols-filled' : ''}`}
            >
              {item.icon}
            </span>
            <span className="text-label-sm font-label-sm">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
