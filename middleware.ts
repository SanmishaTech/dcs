import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/jwt';

// Reverted: Simple auth-only middleware (no role/permission rule evaluation)
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get('accessToken')?.value;

  if (!accessToken) {
    return pathname.startsWith('/api/')
      ? NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    await verifyAccessToken(accessToken);
    return NextResponse.next();
  } catch {
    return pathname.startsWith('/api/')
      ? NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', req.url));
  }
}

// Configure which paths the middleware should run on
export const config = {
  // Match everything and rely on early returns to skip internals/static
  matcher: ['/:path*'],
};
