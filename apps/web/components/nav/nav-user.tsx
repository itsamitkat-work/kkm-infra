'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from '@tabler/icons-react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { useAuth } from '@/hooks/auth';
import { useMyProfileQuery } from '@/hooks/use-my-profile-query';
import { resolveProfileAvatarSrc } from '@/lib/profile-avatar';

type UserData = {
  name: string;
  email: string;
  avatar: string;
};

function getNavUserInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  return parts
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

interface NavUserItemProps {
  user: UserData;
  avatarClassName?: string;
  trailing?: React.ReactNode;
}

function NavUserItem({ user, avatarClassName, trailing }: NavUserItemProps) {
  const initials = getNavUserInitials(user.name);

  return (
    <Item variant='default' size='xs'>
      <ItemMedia variant='icon'>
        <Avatar className={avatarClassName}>
          <AvatarImage
            key={user.avatar}
            src={user.avatar}
            alt={user.name}
          />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{user.name}</ItemTitle>
        <ItemDescription>
          {user.email.trim().length > 0 ? user.email : '\u00a0'}
        </ItemDescription>
      </ItemContent>
      {trailing ? (
        <ItemActions>{trailing}</ItemActions>
      ) : null}
    </Item>
  );
}

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { name: 'light', icon: Sun, label: 'Light' },
    { name: 'dark', icon: Moon, label: 'Dark' },
    { name: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <DropdownMenuGroup>
      {themes.map(({ name, icon: Icon, label }) => (
        <DropdownMenuItem
          key={name}
          onClick={() => setTheme(name)}
          className={theme === name ? 'bg-accent text-accent-foreground' : ''}
        >
          <Icon className='mr-2 h-4 w-4' />
          {label}
          {theme === name && <span className='ml-auto'>✓</span>}
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  );
};

export function NavUser() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { signOut, user, isLoading } = useAuth();
  const profileQuery = useMyProfileQuery(!isLoading && Boolean(user));

  const profile = profileQuery.data;
  const displayNameFromProfile = profile?.display_name?.trim();
  const avatarFromProfile = profile?.avatar_url?.trim() || null;

  const userData: UserData = user
    ? {
        name:
          displayNameFromProfile && displayNameFromProfile.length > 0
            ? displayNameFromProfile
            : user.userName,
        email: user.email,
        avatar: resolveProfileAvatarSrc(
          avatarFromProfile ?? user.avatarUrl ?? null,
        ),
      }
    : {
        name: isLoading ? 'Loading…' : 'Guest',
        email: isLoading ? '' : 'guest@example.com',
        avatar: resolveProfileAvatarSrc(null),
      };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <NavUserItem
                user={userData}
                avatarClassName='grayscale'
                trailing={<IconDotsVertical />}
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='font-normal text-foreground'>
              <NavUserItem user={userData} />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/account')}>
                <IconUserCircle />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconNotification />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <ThemeSwitcher />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
