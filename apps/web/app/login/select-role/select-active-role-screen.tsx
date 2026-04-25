'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import {
  filterRoleSlugsHiddenFromNonSystemAdmins,
  formatRoleSlugForDisplay,
  switchActiveRole,
} from '@/hooks/auth';
import {
  composeAccessTokenContext,
  needsPostLoginRoleSelection,
} from '@/lib/auth';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { EdgeFunctionRateLimitedError } from '@/lib/supabase/invoke-edge-function';

function sanitizeNextPath(raw: string | null): string {
  if (!raw) {
    return '/dashboard';
  }
  if (!raw.startsWith('/') || raw.startsWith('//')) {
    return '/dashboard';
  }
  if (raw.includes('://')) {
    return '/dashboard';
  }
  return raw;
}

export function SelectActiveRoleScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [roleSlugs, setRoleSlugs] = React.useState<string[]>([]);
  const [selectedSlug, setSelectedSlug] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function loadSessionAndRoles() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) {
        return;
      }
      if (!session?.access_token) {
        router.replace('/login');
        return;
      }
      const composed = composeAccessTokenContext(session.access_token);
      if (!needsPostLoginRoleSelection(composed.claims, composed.roles)) {
        router.replace('/dashboard');
        return;
      }
      const slugs = [...composed.roles].filter(
        (s) => typeof s === 'string' && s.trim().length > 0,
      );
      const visibleSlugs = filterRoleSlugsHiddenFromNonSystemAdmins(
        slugs,
        composed.claims?.is_system_admin === true,
      );
      if (visibleSlugs.length < 2) {
        router.replace('/dashboard');
        return;
      }
      setRoleSlugs(visibleSlugs);
      setSelectedSlug(visibleSlugs[0] ?? '');
      setPhase('ready');
    }

    void loadSessionAndRoles().catch(() => {
      if (!cancelled) {
        setPhase('error');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleRoleSlugChange(value: string) {
    setSelectedSlug(value);
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  function handleSignOutClick() {
    void handleSignOut();
  }

  function handleBackToLogin() {
    router.replace('/login');
  }

  async function handleContinue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlug) {
      toast.error('Choose a role to continue.');
      return;
    }
    setIsSubmitting(true);
    try {
      await switchActiveRole(selectedSlug);
      const next = sanitizeNextPath(searchParams.get('next'));
      router.replace(next);
      router.refresh();
    } catch (e) {
      if (e instanceof EdgeFunctionRateLimitedError) {
        return;
      }
      const message =
        e instanceof Error ? e.message : 'Could not set active role';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (phase === 'loading') {
    return (
      <div className='relative flex min-h-svh w-full items-center justify-center'>
        <div className='absolute top-4 right-4 sm:top-6 sm:right-6 z-50'>
          <ThemeToggle />
        </div>
        <Spinner className='size-8' />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className='relative flex min-h-svh w-full flex-col items-center justify-center gap-4 p-4'>
        <div className='absolute top-4 right-4 sm:top-6 sm:right-6 z-50'>
          <ThemeToggle />
        </div>
        <p className='text-muted-foreground text-center text-sm'>
          Something went wrong while loading your session.
        </p>
        <Button type='button' variant='outline' onClick={handleBackToLogin}>
          Back to login
        </Button>
      </div>
    );
  }

  return (
    <div className='relative min-h-svh w-full flex flex-col items-center justify-center p-4'>
      <div className='absolute top-4 right-4 sm:top-6 sm:right-6 z-50'>
        <ThemeToggle />
      </div>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle className='text-lg sm:text-xl'>Select active role</CardTitle>
          <CardDescription className='text-sm'>
            You have more than one role in this workspace. Pick which role you
            want to use now. You can change it later from the app where
            switching is available.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-6'>
          <form className='flex flex-col gap-6' onSubmit={handleContinue}>
            <RadioGroup value={selectedSlug} onValueChange={handleRoleSlugChange}>
              <div className='grid gap-3'>
                {roleSlugs.map((slug) => {
                  const inputId = `active-role-${slug}`;
                  return (
                    <div
                      key={slug}
                      className='flex items-center gap-3 rounded-lg border p-3'
                    >
                      <RadioGroupItem value={slug} id={inputId} />
                      <Label htmlFor={inputId} className='flex-1 cursor-pointer'>
                        <span className='font-medium'>
                          {formatRoleSlugForDisplay(slug)}
                        </span>
                        <span className='text-muted-foreground block text-xs font-normal'>
                          {slug}
                        </span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
            <Button type='submit' className='w-full' disabled={isSubmitting}>
              {isSubmitting ? (
                <span className='inline-flex items-center gap-2'>
                  <Spinner className='size-4' />
                  Continuing…
                </span>
              ) : (
                'Continue to app'
              )}
            </Button>
          </form>
          <Button
            type='button'
            variant='ghost'
            className='w-full text-muted-foreground'
            onClick={handleSignOutClick}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
