'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LEGAL_FOOTER } from '@/lib/constants';

export default function Footer() {
  const [year, setYear] = useState('2026');

  useEffect(() => {
    setYear(new Date().getFullYear().toString());
  }, []);

  return (
    <footer className="px-margin-mobile py-6 border-t border-outline-variant/30 mt-stack-lg mb-20">
      <div className="text-center space-y-3">
        <p className="text-label-sm text-on-surface-variant font-normal">
          {LEGAL_FOOTER}
        </p>
        <div className="flex justify-center gap-4 text-label-sm text-on-surface-variant">
          <Link href="/terminos" className="hover:text-primary transition-colors">Términos</Link>
          <span>·</span>
          <Link href="/privacidad" className="hover:text-primary transition-colors">Privacidad</Link>
          <span>·</span>
          <a href="mailto:contacto@nexaa.cl" className="hover:text-primary transition-colors">Contacto</a>
          <span>·</span>
          <Link href="/reportar" className="hover:text-primary transition-colors">Reportar error</Link>
        </div>
        <p className="text-label-sm text-on-surface-variant/60">
          © {year} NEXAA — Región de Ñuble, Chile
        </p>
      </div>
    </footer>
  );
}
