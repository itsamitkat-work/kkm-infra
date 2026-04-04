'use client';

import { useRouter } from 'next/navigation';
import type { ElementType } from 'react';

import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';

type SidebarLinkProps = {
  item: {
    title: string;
    url: string;
    icon: ElementType;
  };
};

export function SidebarLink({ item }: SidebarLinkProps) {
  const { state } = useSidebar();
  const router = useRouter();

  return (
    <SidebarMenuButton asChild tooltip={item.title}>
      <a
        href={item.url}
        onClick={(e) => {
          if (state === 'collapsed') {
            e.stopPropagation();
            e.preventDefault();
            router.push(item.url);
          }
        }}
      >
        <item.icon />
        <span>{item.title}</span>
      </a>
    </SidebarMenuButton>
  );
}
