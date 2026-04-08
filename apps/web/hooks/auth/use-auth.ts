'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  AuthChangeEvent,
  Session,
  User as SupabaseUser,
} from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { LoginCredentials, User } from '@/types/auth';

function mapSupabaseUserToAppUser(user: SupabaseUser): User {
  const meta = user.user_metadata as Record<string, string | undefined> | undefined;
  return {
    hashId: meta?.hash_id ?? user.id,
    userName:
      meta?.display_name ??
      meta?.full_name ??
      user.email?.split('@')[0] ??
      'User',
    phone: user.phone ?? meta?.phone ?? '',
    email: user.email ?? '',
    designation: meta?.designation ?? null,
  };
}

function parseJwtStringArray(accessToken: string, key: string): string[] {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return [];
    const pad = '=='.slice(0, (4 - (payload.length % 4)) % 4);
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const claims = JSON.parse(atob(b64)) as Record<string, unknown>;
    const value = claims[key];
    return Array.isArray(value) ? (value as string[]) : [];
  } catch {
    return [];
  }
}

function syncClaimsFromSession(session: Session | null) {
  if (!session?.access_token) {
    return { permissions: [] as string[], roles: [] as string[] };
  }
  const token = session.access_token;
  return {
    permissions: parseJwtStringArray(token, 'permissions'),
    roles: parseJwtStringArray(token, 'roles'),
  };
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const [loginPending, setLoginPending] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    function applySession(session: Session | null) {
      if (!session?.user) {
        setUser(null);
        setPermissions([]);
        setRoles([]);
        return;
      }
      setUser(mapSupabaseUserToAppUser(session.user));
      const claims = syncClaimsFromSession(session);
      setPermissions(claims.permissions);
      setRoles(claims.roles);
    }

    void (async function loadSession() {
      const result = await supabase.auth.getSession();
      if (result.error) setSessionError(result.error);
      applySession(result.data.session);
      setIsSessionLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        applySession(session);
      },
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setLoginPending(true);
      setLoginFailed(false);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password,
      });
      setLoginPending(false);
      if (error) {
        setLoginFailed(true);
        toast.error(`Login failed: ${error.message}`);
        return;
      }
      router.push('/dashboard');
    },
    [router],
  );

  const logout = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    toast.success('Logged out successfully!');
    router.push('/login');
  }, [router]);

  const isAuthenticated = useCallback(() => Boolean(user), [user]);

  const getUser = useCallback(() => user, [user]);

  const getUserPermissions = useCallback(
    () => ({ permissions, roles }),
    [permissions, roles],
  );

  return {
    login,
    logout,
    isAuthenticated,
    getUser,
    getUserPermissions,
    isLoading: isSessionLoading || loginPending,
    isError: loginFailed,
    error: sessionError,
  };
}
