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
import { useAuth } from '@/hooks/auth/use-auth';

type UserData = {
  name: string;
  email: string;
  avatar: string;
};

const UserInfo = ({ user }: { user: UserData }) => (
  <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
    <Avatar className='h-8 w-8 rounded-lg'>
      <AvatarImage src={user.avatar} alt={user.name} />
      <AvatarFallback className='rounded-lg'>
        {user.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className='grid flex-1 text-left text-sm leading-tight'>
      <span className='truncate font-medium'>{user.name}</span>
      <span className='text-muted-foreground truncate text-xs'>
        {user.email}
      </span>
    </div>
  </div>
);

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
  const { logout, getUser } = useAuth();
  const [isClient, setIsClient] = React.useState(false);

  // Ensure client-side rendering only
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Get user data from auth context (only on client)
  const user = isClient ? getUser() : null;

  // Fallback user data if not authenticated
  const userData: UserData = user
    ? {
        name: user.userName,
        email: user.email,
        avatar: '', // You can add avatar URL to user data if needed
      }
    : {
        name: 'Guest',
        email: 'guest@example.com',
        avatar: '',
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
              <Avatar className='h-8 w-8 rounded-lg grayscale'>
                <AvatarImage src={userData.avatar} alt={userData.name} />
                <AvatarFallback className='rounded-lg'>
                  {userData.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{userData.name}</span>
                <span className='text-muted-foreground truncate text-xs'>
                  {userData.email}
                </span>
              </div>
              <IconDotsVertical className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <UserInfo user={userData} />
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
            <DropdownMenuItem onClick={logout}>
              <IconLogout />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
