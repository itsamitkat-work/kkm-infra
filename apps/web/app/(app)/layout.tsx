'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ReactQueryProvider } from '@/app/react-query-provider';
import { useBreadcrumbStore } from '@/hooks/use-breadcrumb-store';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

/** Route path (no leading slash) -> display label for that segment level */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  hr: 'HR',
  'hr/employees': 'Employees',
  projects: 'Projects',
  'projects-assigned': 'Assigned Projects',
  'bom&bol': 'BOM & BOL',
  indents: 'Indents',
  'indents/create': 'Create Indent',
  prn: 'PRN',
  attendance: 'Attendance',
  'attendance/supervisors': 'Supervisors',
  'attendance/engineers': 'Engineers',
  'attendance/report': 'Attendance Report',
  pool: 'Resource Pool',
  clients: 'Clients',
  items: 'Items',
  'items-tree': 'Schedule items tree',
  'basic-rates': 'Basic Rates',
  factors: 'Factors',
  administration: 'Administration',
  'administration/page-actions-matrix': 'Page Actions',
  'administration/roles': 'Roles & Permissions',
  'role-permissions': 'Role Permissions',
  'administration/users': 'Users',
  'administration/employee-types': 'Employee Types',
  'administration/designations': 'Designations',
  'administration/material': 'Material',
  'administration/plant-machine-carrige': 'Plant & Machine Carrige',
  'administration/item-map': 'Item Map',
  'administration/labour': 'Labour',
  account: 'Account',
  'coming-soon': 'Coming Soon',
};

/** Labels for dynamic segment (e.g. [id]) based on parent path prefix */
const DYNAMIC_SEGMENT_LABELS: Record<string, string> = {
  projects: 'Project',
  'administration/roles': 'Role',
  items: 'Item Details',
};

function isDynamicSegment(segment: string): boolean {
  return (
    segment.length >= 20 ||
    /^[a-f0-9-]{36}$/i.test(segment) ||
    /^[a-zA-Z0-9_-]{20,}$/.test(segment)
  );
}

function titleCase(segment: string): string {
  return segment
    .split(/[-&]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function getSegmentLabel(
  parentPath: string,
  segment: string,
  options?: { tab?: string | null }
): string {
  const fullPath = parentPath ? `${parentPath}/${segment}` : segment;
  const exact = ROUTE_LABELS[fullPath];
  if (exact) return exact;
  const segmentOnly = ROUTE_LABELS[segment];
  if (segmentOnly) return segmentOnly;
  if (isDynamicSegment(segment)) {
    if (parentPath === 'items' && options?.tab === 'justification') {
      return 'Item Justification';
    }
    return DYNAMIC_SEGMENT_LABELS[parentPath] ?? 'Details';
  }
  return titleCase(segment);
}

function generateBreadcrumbs(
  pathname: string,
  searchParams?: { get(key: string): string | null } | null,
  labelOverrides?: Record<string, string> | null
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  breadcrumbs.push({
    label: 'Dashboard',
    href: '/dashboard',
  });

  if (segments.length === 0) {
    breadcrumbs[0].isCurrentPage = true;
    return breadcrumbs;
  }

  const tab = searchParams?.get('tab') ?? null;
  let pathSoFar = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    pathSoFar = pathSoFar ? `${pathSoFar}/${segment}` : segment;
    const href = `/${pathSoFar}`;
    const isLast = i === segments.length - 1;
    const parentPath = pathSoFar.split('/').slice(0, -1).join('/');
    const labelOptions = isLast ? { tab } : undefined;
    const label =
      labelOverrides?.[pathSoFar] ??
      getSegmentLabel(parentPath, segment, labelOptions);
    breadcrumbs.push({
      label,
      href: isLast ? undefined : href,
      isCurrentPage: isLast,
    });
  }

  return breadcrumbs;
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const labelOverrides = useBreadcrumbStore((s) => s.labelOverrides);
  const breadcrumbs = generateBreadcrumbs(
    pathname,
    searchParams,
    labelOverrides
  );

  return (
    <>
      <AppSidebar variant='inset' />
      <SidebarInset>
        <SiteHeader breadcrumbs={breadcrumbs} />
        <div className='flex flex-1 flex-col'>
          <div className='@container/main flex flex-1 flex-col gap-2'>
            <div className='flex flex-col gap-4 py-2 md:gap-6 md:py-2'>
              <ReactQueryProvider>{children}</ReactQueryProvider>
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <Suspense
        fallback={
          <>
            <AppSidebar variant='inset' />
            <SidebarInset>
              <SiteHeader breadcrumbs={[]} />
              <div className='flex flex-1 flex-col'>
                <div className='@container/main flex flex-1 flex-col gap-2'>
                  <div className='flex flex-col gap-4 py-2 md:gap-6 md:py-2'>
                    <div className='h-8 w-48 animate-pulse rounded bg-muted' />
                  </div>
                </div>
              </div>
            </SidebarInset>
          </>
        }
      >
        <AppLayoutInner>{children}</AppLayoutInner>
      </Suspense>
    </SidebarProvider>
  );
}
