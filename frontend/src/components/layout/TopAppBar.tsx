'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TopAppBar() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
      lastScrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('nexaa_theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = savedTheme === 'dark' || (!savedTheme && systemPrefersDark) ? 'dark' : 'light';
      
      setTheme(initialTheme);
      if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexaa_theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 bg-surface-container-lowest flex justify-between items-center px-margin-mobile h-14 border-b border-outline-variant transition-transform duration-300 ${
        scrolled ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">location_on</span>
        <span className="text-label-md font-label-md text-primary">Ñuble</span>
      </div>

      <Link href="/" className="absolute left-1/2 -translate-x-1/2">
        <span className="text-headline-md font-headline-md text-primary tracking-tight">
          NEXA<span className="text-blue-600">A</span>
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="text-on-surface-variant hover:text-primary transition-all p-1.5 rounded-full hover:bg-surface-container active:scale-95 flex items-center justify-center"
          title={theme === 'light' ? 'Activar Modo Oscuro' : 'Activar Modo Claro'}
          aria-label="Alternar tema"
        >
          <span className="material-symbols-outlined text-[22px]">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>
      </div>
    </header>
  );
}
