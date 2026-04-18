'use client';

import * as React from 'react';
import {
  FolderOpen,
  GalleryVerticalEnd,
  HardHat,
  SquareTerminal,
  UserCog,
  Users,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { NavUser } from '@/components/nav/nav-user';
import { TeamSwitcher } from '@/components/team-switcher';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  IconFileText,
  IconHome,
  IconShieldLock,
  IconUser,
} from '@tabler/icons-react';
import { FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/auth';
type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon | typeof IconHome;
};

const generalItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: IconHome,
  },
];

const hrItems: NavItem[] = [
  {
    title: 'Employees',
    url: '/hr/employees',
    icon: UserCog,
  },
];

const purchaseOrderItems: NavItem[] = [
  {
    title: 'Indents',
    url: '/indents',
    icon: IconFileText,
  },
  {
    title: 'PRN',
    url: '/prn',
    icon: IconFileText,
  },
];

const administrationItems: NavItem[] = [
  {
    title: 'Page Actions',
    url: '/administration/page-actions-matrix',
    icon: IconShieldLock,
  },
  {
    title: 'Roles & Permissions',
    url: '/administration/roles',
    icon: IconShieldLock,
  },
  {
    title: 'Users',
    url: '/administration/users',
    icon: IconUser,
  },
  {
    title: 'Employee Types',
    url: '/administration/employee-types',
    icon: IconFileText,
  },
  {
    title: 'Designations',
    url: '/administration/designations',
    icon: UserCog,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useSidebar();
  const isMobile = useIsMobile();
  const { roles, ability } = useAuth();

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
        icon: IconFileText,
      });
    }
    items.push({
      title: 'Schedule Items',
      url: '/schedule-items',
      icon: IconFileText,
    });
    const canSeeBasicRates =
      ability.can('read', 'basic_rates') || ability.can('manage', 'basic_rates');
    if (canSeeBasicRates) {
      items.push({
        title: 'Basic Rates',
        url: '/basic-rates',
        icon: IconFileText,
      });
    }
    return items;
  }, [ability]);

  const attendanceItems = React.useMemo(() => {
    // Only filter when in browser (client-side)
    if (typeof window === 'undefined') {
      return [];
    }

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
      ...(ability.can('read', 'assigned_projects')
        ? [
            {
              title: 'Assigned Projects',
              url: '/projects-assigned',
              icon: FolderOpen,
            },
          ]
        : []),

      ...(ability.can('read', 'projects')
        ? [
            {
              title: 'Projects',
              url: '/projects',
              icon: HardHat,
            },
          ]
        : []),
      {
        title: 'BOM & BOL',
        url: '/bom&bol',
        icon: IconFileText,
      },
    ],

    [ability]
  );

  function handleNavClick(e: React.MouseEvent, url: string) {
    if (state === 'collapsed' && !isMobile) {
      e.preventDefault();
      e.stopPropagation();
      router.push(url);
    }
  }

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
          <a href={item.url} onClick={(e) => handleNavClick(e, item.url)}>
            <item.icon />
            <span>{item.title}</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));
  }

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <TeamSwitcher
          teams={[
            {
              name: 'KKM Infra',
              logo: GalleryVerticalEnd,
              plan: 'Enterprise',
            },
          ]}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>{renderNavItems(generalItems)}</SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Attendance</SidebarGroupLabel>
          <SidebarMenu>{renderNavItems(attendanceItems)}</SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Construction Works</SidebarGroupLabel>
          <SidebarMenu>{renderNavItems(constructionItems)}</SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Procurement</SidebarGroupLabel>
          <SidebarMenu>{renderNavItems(purchaseOrderItems)}</SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Construction Tools</SidebarGroupLabel>
          <SidebarMenu>{renderNavItems(constructionToolsItems)}</SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>HR</SidebarGroupLabel>
          <SidebarMenu>{renderNavItems(hrItems)}</SidebarMenu>
        </SidebarGroup>

        {typeof window !== 'undefined' && roles.includes('Admin') && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>{renderNavItems(administrationItems)}</SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
