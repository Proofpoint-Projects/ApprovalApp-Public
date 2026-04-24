import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/proofpoint-logo.png' ||
    pathname === '/favicon.png' ||
    pathname === '/favicon.ico' ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff|woff2|ttf|eot)$/i.test(pathname)
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isPublicRoute = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isPublicRoute || isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get('approval.sid')?.value ||
    request.cookies.get('session')?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    const nextValue = pathname + search;

    if (nextValue && nextValue !== '/login') {
      loginUrl.searchParams.set('next', nextValue);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api).*)']
};