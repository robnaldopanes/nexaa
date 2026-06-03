import type { Metadata, Viewport } from 'next';
// Deploy: 2026-05-31 02:23:14
import '@/styles/globals.css';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://celebrated-commitment-production-737c.up.railway.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'NEXAA - Noticias de Ñuble',
    template: '%s | NEXAA Ñuble',
  },
  description: 'Noticias regionales de Ñuble, Chile. Información actualizada con inteligencia artificial. Chillán, San Carlos, Bulnes y más.',
  keywords: ['noticias', 'Ñuble', 'Chillán', 'noticias regionales', 'Chile', 'NEXAA'],
  authors: [{ name: 'NEXAA' }],
  creator: 'NEXAA',
  publisher: 'NEXAA',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    siteName: 'NEXAA Ñuble',
    title: 'NEXAA - Noticias de Ñuble',
    description: 'Noticias regionales de Ñuble, Chile. Información actualizada con inteligencia artificial.',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NEXAA - Noticias de Ñuble',
    description: 'Noticias regionales de Ñuble, Chile.',
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f7f9fb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="light">
      <head>
        <link rel="icon" href="/favicon.jpg" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
