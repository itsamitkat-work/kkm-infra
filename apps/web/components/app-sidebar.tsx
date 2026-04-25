'use client';

import * as React from 'react';
import {
  Building2,
  FileText,
  HardHat,
  Home,
  Shield,
  SquareTerminal,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NavUser } from '@/components/nav/nav-user';
import { TenantSwitcher } from '@/components/tenant-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/auth';

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

const generalItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
  },
];

const purchaseOrderItems: NavItem[] = [
  {
    title: 'Indents',
    url: '/indents',
    icon: FileText,
  },
  {
    title: 'PRN',
    url: '/prn',
    icon: FileText,
  },
];

const TENANTS_ADMIN_URL = '/administration/tenants';

const administrationItems: NavItem[] = [
  {
    title: 'Users',
    url: '/administration/users',
    icon: User,
  },
  {
    title: 'Roles',
    url: '/administration/roles',
    icon: Shield,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { roles, ability, claims } = useAuth();

  const administrationNavItems = React.useMemo((): NavItem[] => {
    const items: NavItem[] = [];
    const isSystemAdmin = claims?.is_system_admin === true;
    const canAccessTenantDirectory = ability.can('manage', 'tenant_members');
    const canAccessRoles = ability.can('manage', 'tenant_roles');

    if (isSystemAdmin || canAccessTenantDirectory || canAccessRoles) {
      for (const item of administrationItems) {
        if (item.url === '/administration/roles') {
          if (isSystemAdmin || canAccessRoles) {
            items.push(item);
          }
          continue;
        }
        if (isSystemAdmin || canAccessTenantDirectory) {
          items.push(item);
        }
      }
    }
    if (isSystemAdmin) {
      items.push({
        title: 'Tenants',
        url: TENANTS_ADMIN_URL,
        icon: Building2,
      });
    }
    return items;
  }, [claims, ability]);

  const constructionToolsItems = React.useMemo((): NavItem[] => {
    const items: NavItem[] = [];
    const canSeeClients =
      ability.can('read', 'clients') || ability.can('manage', 'clients');
    if (canSeeClients) {
      items.push({
        title: 'Clients',
        url: '/clients',
        icon: Users,
      });
    }
    const canSeeSchedules =
      ability.can('read', 'schedules') || ability.can('manage', 'schedules');
    if (canSeeSchedules) {
      items.push({
        title: 'Schedules',
        url: '/schedules',
        icon: FileText,
      });
    }
    items.push({
      title: 'Schedule Items',
      url: '/schedule-items',
      icon: FileText,
    });
    const canSeeBasicRates =
      ability.can('read', 'basic_rates') ||
      ability.can('manage', 'basic_rates');
    if (canSeeBasicRates) {
      items.push({
        title: 'Schedule Basic Rates',
        url: '/basic-rates',
        icon: FileText,
      });
    }
    return items;
  }, [ability]);

  const attendanceItems = React.useMemo(() => {
    const attendanceItems: NavItem[] = [
      ...(ability.can('read', 'attendance') &&
      !(roles.includes('Verifier') || roles.includes('Checker'))
        ? [
            {
              title: 'Attendance',
              url: '/attendance',
              icon: SquareTerminal,
            },
          ]
        : []),
      ...(ability.can('read', 'attendance') && roles.includes('Checker')
        ? [
            {
              title: 'Attendance',
              url: '/attendance/supervisors',
              icon: SquareTerminal,
            },
          ]
        : []),
      ...(ability.can('read', 'attendance') && roles.includes('Verifier')
        ? [
            {
              title: 'Attendance',
              url: '/attendance/engineers',
              icon: SquareTerminal,
            },
          ]
        : []),
      ...(ability.can('read', 'resource_pool')
        ? [
            {
              title: 'Resource Pool',
              url: '/pool',
              icon: Users,
            },
          ]
        : []),
      ...(ability.can('read', 'attendance')
        ? [
            {
              title: 'Attendance Report',
              url: '/attendance/report',
              icon: FileText,
            },
          ]
        : []),
    ];

    return attendanceItems;
  }, [ability, roles]);

  const constructionItems: NavItem[] = React.useMemo(
    () => [
      ...(ability.can('read', 'projects')
        ? [
            {
              title: 'Projects',
              url: '/projects',
              icon: HardHat,
            },
          ]
        : []),
      // {
      //   title: 'BOM & BOL',
      //   url: '/bom&bol',
      //   icon: FileText,
      // },
    ],

    [ability]
  );

  function renderNavItems(items: NavItem[]) {
    return items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton
          asChild
          tooltip={item.title}
          isActive={
            pathname === item.url || pathname.startsWith(item.url + '/')
          }
        >
          <Link href={item.url}>
            <item.icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));
  }

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <TenantSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>{renderNavItems(generalItems)}</SidebarMenu>
        </SidebarGroup>

        {/* <SidebarGroup>
          <SidebarGroupLabel>Attendance</SidebarGroupLabel>
          <SidebarMenu>{renderNavItems(attendanceItems)}</SidebarMenu>
        </SidebarGroup> */}

        <SidebarGroup>
          <SidebarGroupLabel>Construction Works</SidebarGroupLabel>
          <SidebarMenu>{renderNavItems(constructionItems)}</SidebarMenu>
        </SidebarGroup>

        {/* <SidebarGroup>
          <SidebarGroupLabel>Procurement</SidebarGroupLabel>
          <SidebarMenu>{renderNavItems(purchaseOrderItems)}</SidebarMenu>
        </SidebarGroup> */}

        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarMenu>{renderNavItems(constructionToolsItems)}</SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarMenu>{renderNavItems(administrationNavItems)}</SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
