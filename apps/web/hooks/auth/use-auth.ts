'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  AuthChangeEvent,
  Session,
} from '@supabase/supabase-js';
import {
  composeAccessTokenContext,
  mapSupabaseUserToAppUser,
} from '@/lib/auth';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { LoginCredentials, User } from '@/types/auth';
import type { AccessTokenClaims } from '@/types/jwt-claims';
import { defineAbilityFor, type AppAbility } from '@/lib/authz/define-ability';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [claims, setClaims] = useState<AccessTokenClaims | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const [signInPending, setSignInPending] = useState(false);
  const [signInFailed, setSignInFailed] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    function applySession(session: Session | null) {
      if (!session?.user) {
        setUser(null);
        setPermissions([]);
        setRoles([]);
        setClaims(null);
        return;
      }
      setUser(mapSupabaseUserToAppUser(session.user));
      const composed = composeAccessTokenContext(session.access_token);
      setPermissions(composed.permissions);
      setRoles(composed.roles);
      setClaims(composed.claims);
    }

    void (async function loadInitialSession() {
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

  const signIn = useCallback(
    async (credentials: LoginCredentials) => {
      setSignInPending(true);
      setSignInFailed(false);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password,
      });
      setSignInPending(false);
      if (error) {
        setSignInFailed(true);
        toast.error(`Login failed: ${error.message}`);
        return;
      }
      router.push('/dashboard');
    },
    [router],
  );

  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    toast.success('Logged out successfully!');
    router.push('/login');
  }, [router]);

  const isLoading = isSessionLoading || signInPending;

  const ability = useMemo<AppAbility>(
    () => defineAbilityFor({ permissions, claims }),
    [permissions, claims]
  );

  return {
    user,
    permissions,
    roles,
    claims,
    ability,
    signIn,
    signOut,
    isLoading,
    isError: signInFailed,
    error: sessionError,
  };
}
