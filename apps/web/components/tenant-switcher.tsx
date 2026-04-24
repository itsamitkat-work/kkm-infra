'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  Building2,
  Check,
  ChevronsUpDown,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  formatRoleSlugForDisplay,
  getDistinctSortedRoleSlugs,
  switchActiveRole,
  useAuth,
} from '@/hooks/auth';
import {
  MY_SWITCHABLE_TENANTS_QUERY_KEY,
  useMySwitchableTenants,
} from '@/hooks/use-my-switchable-tenants';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  EdgeFunctionRateLimitedError,
  invokeEdgeFunction,
} from '@/lib/supabase/invoke-edge-function';

type SwitchTenantFnResponse = {
  tenant_id?: string;
  session_refresh_required?: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
  } | null;
  error?: string;
};

interface TenantSwitcherRoleRowProps {
  slug: string;
  isActive: boolean;
  isBusy: boolean;
  onActivate: () => void;
}

function TenantSwitcherRoleRow({
  slug,
  isActive,
  isBusy,
  onActivate,
}: TenantSwitcherRoleRowProps) {
  return (
    <DropdownMenuItem
      disabled={isBusy || isActive}
      onClick={onActivate}
      className='gap-2 p-2'
    >
      <div className='flex size-6 items-center justify-center rounded-md border'>
        <BadgeCheck className='size-3.5 shrink-0' />
      </div>
      <div className='grid flex-1 text-left text-sm leading-tight'>
        <span className='truncate font-medium'>
          {formatRoleSlugForDisplay(slug)}
        </span>
        <span className='text-muted-foreground truncate text-xs'>{slug}</span>
      </div>
      {isActive ? <Check className='size-4 shrink-0 opacity-60' /> : null}
      {isBusy ? <Loader2 className='size-4 shrink-0 animate-spin' /> : null}
    </DropdownMenuItem>
  );
}

export function TenantSwitcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isMobile } = useSidebar();
  const { user, claims, roles } = useAuth();
  const { data: tenants = [], isLoading, isError } = useMySwitchableTenants(
    Boolean(user),
  );
  const [pendingTenantId, setPendingTenantId] = React.useState<string | null>(
    null,
  );
  const [pendingRoleSlug, setPendingRoleSlug] = React.useState<string | null>(
    null,
  );

  const activeTenantId = claims?.tid ?? null;
  const activeTenant =
    tenants.find((t) => t.tenant_id === activeTenantId) ?? tenants[0];

  const roleOptions = React.useMemo(
    () => getDistinctSortedRoleSlugs(roles),
    [roles],
  );
  const activeRoleSlug =
    typeof claims?.active_role === 'string'
      ? claims.active_role.trim()
      : '';
  const activeRoleSlugOrNull =
    activeRoleSlug.length > 0 ? activeRoleSlug : null;

  const canSwitchTenants = tenants.length > 1;
  const canSwitchRoles = roleOptions.length > 1;
  const showSwitcherMenu = canSwitchTenants || canSwitchRoles;

  async function switchToTenant(tenantId: string) {
    if (tenantId === activeTenantId) {
      return;
    }
    setPendingTenantId(tenantId);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const refreshToken = session?.refresh_token;
      if (!refreshToken) {
        toast.error('Session is missing; sign in again.');
        return;
      }
      const { data: invokeData, error } = await invokeEdgeFunction(
        supabase,
        'switch-tenant',
        {
          body: { tenant_id: tenantId, refresh_token: refreshToken },
        },
      );
      const data = invokeData as SwitchTenantFnResponse | null | undefined;
      if (error) {
        if (error instanceof EdgeFunctionRateLimitedError) {
          return;
        }
        toast.error(error.message ?? 'Failed to switch workspace');
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.session?.access_token && data.session.refresh_token) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (setErr) {
          throw setErr;
        }
      } else if (data?.session_refresh_required) {
        const { error: refErr } = await supabase.auth.refreshSession();
        if (refErr) {
          throw refErr;
        }
      }
      await queryClient.invalidateQueries({ queryKey: MY_SWITCHABLE_TENANTS_QUERY_KEY });
      router.refresh();
      toast.success('Workspace switched');
    } catch (e) {
      if (e instanceof EdgeFunctionRateLimitedError) {
        return;
      }
      const message = e instanceof Error ? e.message : 'Failed to switch workspace';
      toast.error(message);
    } finally {
      setPendingTenantId(null);
    }
  }

  async function switchToActiveRole(roleSlug: string) {
    if (roleSlug === activeRoleSlugOrNull) {
      return;
    }
    setPendingRoleSlug(roleSlug);
    try {
      await switchActiveRole(roleSlug);
      await queryClient.invalidateQueries({
        queryKey: MY_SWITCHABLE_TENANTS_QUERY_KEY,
      });
      router.refresh();
      toast.success('Active role updated');
    } catch (e) {
      if (e instanceof EdgeFunctionRateLimitedError) {
        return;
      }
      const message =
        e instanceof Error ? e.message : 'Failed to switch active role';
      toast.error(message);
    } finally {
      setPendingRoleSlug(null);
    }
  }

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' disabled className='cursor-wait'>
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
              <Loader2 className='size-4 animate-spin' />
            </div>
            <div className='grid flex-1 text-left text-sm leading-tight'>
              <span className='truncate font-medium'>Loading…</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (isError || !activeTenant) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' disabled>
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
              <Building2 className='size-4' />
            </div>
            <div className='grid flex-1 text-left text-sm leading-tight'>
              <span className='truncate font-medium'>Workspace</span>
              <span className='text-muted-foreground truncate text-xs'>
                Unavailable
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const menuPending =
    pendingTenantId !== null || pendingRoleSlug !== null;

  const triggerButton = (
    <SidebarMenuButton
      size='lg'
      className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
      disabled={showSwitcherMenu && menuPending}
    >
      <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
        <Building2 className='size-4' />
      </div>
      <div className='grid flex-1 text-left text-sm leading-tight'>
        <span className='truncate font-medium'>{activeTenant.tenant_name}</span>
        <span className='text-muted-foreground truncate text-xs'>
          {canSwitchRoles && activeRoleSlugOrNull
            ? formatRoleSlugForDisplay(activeRoleSlugOrNull)
            : activeTenant.tenant_slug}
        </span>
      </div>
      {showSwitcherMenu ? (
        menuPending ? (
          <Loader2 className='ml-auto size-4 shrink-0 animate-spin' />
        ) : (
          <ChevronsUpDown className='ml-auto' />
        )
      ) : null}
    </SidebarMenuButton>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {showSwitcherMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
              align='start'
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              {canSwitchTenants ? (
                <>
                  <DropdownMenuLabel className='text-muted-foreground text-xs'>
                    Workspace
                  </DropdownMenuLabel>
                  {tenants.map((tenant) => {
                    const isActive = tenant.tenant_id === activeTenantId;
                    const isBusy = pendingTenantId === tenant.tenant_id;
                    function handleTenantRowActivate() {
                      void switchToTenant(tenant.tenant_id);
                    }
                    return (
                      <DropdownMenuItem
                        key={tenant.tenant_id}
                        disabled={isBusy || isActive}
                        onClick={handleTenantRowActivate}
                        className='gap-2 p-2'
                      >
                        <div className='flex size-6 items-center justify-center rounded-md border'>
                          <Building2 className='size-3.5 shrink-0' />
                        </div>
                        <div className='grid flex-1 text-left text-sm leading-tight'>
                          <span className='truncate font-medium'>
                            {tenant.tenant_name}
                          </span>
                          <span className='text-muted-foreground truncate text-xs'>
                            {tenant.tenant_slug}
                          </span>
                        </div>
                        {isActive ? (
                          <Check className='size-4 shrink-0 opacity-60' />
                        ) : null}
                        {isBusy ? (
                          <Loader2 className='size-4 shrink-0 animate-spin' />
                        ) : null}
                      </DropdownMenuItem>
                    );
                  })}
                </>
              ) : null}
              {canSwitchTenants && canSwitchRoles ? (
                <DropdownMenuSeparator />
              ) : null}
              {canSwitchRoles ? (
                <>
                  <DropdownMenuLabel className='text-muted-foreground text-xs'>
                    Active role
                  </DropdownMenuLabel>
                  {roleOptions.map((slug) => {
                    const isActive = slug === activeRoleSlugOrNull;
                    const isBusy = pendingRoleSlug === slug;
                    function handleRoleRowActivate() {
                      void switchToActiveRole(slug);
                    }
                    return (
                      <TenantSwitcherRoleRow
                        key={slug}
                        slug={slug}
                        isActive={isActive}
                        isBusy={isBusy}
                        onActivate={handleRoleRowActivate}
                      />
                    );
                  })}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          triggerButton
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
