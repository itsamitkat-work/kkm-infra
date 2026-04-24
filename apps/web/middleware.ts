import type { Database } from '@kkm/db';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import {
  composeAccessTokenContext,
  needsPostLoginRoleSelection,
} from '@/lib/auth';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env';

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

function isPublicPath(pathname: string): boolean {
  if (pathname === '/login') return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname === '/favicon.ico') return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  const tokenContext = session?.access_token
    ? composeAccessTokenContext(session.access_token)
    : { claims: null, roles: [] as string[] };

  const rolePickNeeded =
    Boolean(user) &&
    needsPostLoginRoleSelection(tokenContext.claims, tokenContext.roles);

  if (user && !rolePickNeeded && pathname === '/login/select-role') {
    const redirectResponse = NextResponse.redirect(
      new URL('/dashboard', request.url),
    );
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (user && rolePickNeeded && pathname !== '/login/select-role') {
    if (!isPublicPath(pathname)) {
      const selectRoleUrl = new URL('/login/select-role', request.url);
      if (pathname !== '/login' && pathname !== '/') {
        const nextPath = pathname + request.nextUrl.search;
        selectRoleUrl.searchParams.set('next', nextPath);
      }
      const redirectResponse = NextResponse.redirect(selectRoleUrl);
      copyCookies(supabaseResponse, redirectResponse);
      return redirectResponse;
    }
  }

  if (user && pathname === '/login') {
    const dest = rolePickNeeded ? '/login/select-role' : '/dashboard';
    const redirectResponse = NextResponse.redirect(new URL(dest, request.url));
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (user && pathname === '/') {
    const dest = rolePickNeeded ? '/login/select-role' : '/dashboard';
    const redirectResponse = NextResponse.redirect(new URL(dest, request.url));
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (!user && pathname === '/') {
    const redirectResponse = NextResponse.redirect(
      new URL('/login', request.url),
    );
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
