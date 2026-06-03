import { NextRequest, NextResponse } from 'next/server';

const DYNAMIC_ROUTES = [
  '/',
  '/buscar',
  '/fotos',
  '/comunas',
  '/categorias',
  '/admin',
  '/reportar',
  '/noticia',
  '/terminos',
  '/privacidad',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDynamic = DYNAMIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isDynamic) return NextResponse.next();

  const response = NextResponse.next();

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|manifest.json|sw.js|robots.txt|icon.jpg).*)',
  ],
};
