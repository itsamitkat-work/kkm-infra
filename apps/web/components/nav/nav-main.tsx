'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

type NavItemProps = {
  item: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      icon?: LucideIcon;
    }[];
  };
  openItems: string[];
  handleToggle: (itemTitle: string) => void;
  openPopovers: Record<string, boolean>;
  handlePopoverOpenChange: (itemTitle: string, open: boolean) => void;
  handleSubmenuItemClick: (
    itemTitle: string,
    subItemUrl: string,
    e: React.MouseEvent
  ) => void;
};

const NavItem = ({
  item,
  openItems,
  handleToggle,
  openPopovers,
  handlePopoverOpenChange,
  handleSubmenuItemClick,
}: NavItemProps) => {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isMobile = useIsMobile();

  const isParentActive =
    pathname.startsWith(item.url) ||
    (item.items &&
      item.items.some((subItem) => pathname.startsWith(subItem.url)));

  return (
    <SidebarMenuItem>
      {item.items && item.items.length > 0 ? (
        // Item with submenu
        state === 'collapsed' && !isMobile ? (
          // Collapsed state: Show popover with submenu items
          <Popover
            open={openPopovers[item.title] || false}
            onOpenChange={(open) => handlePopoverOpenChange(item.title, open)}
          >
            <PopoverTrigger asChild>
              <SidebarMenuButton tooltip={item.title} isActive={isParentActive}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent side='right' align='start' className='w-48 p-1'>
              <div className='flex flex-col gap-1'>
                {item.items.map((subItem) => (
                  <button
                    key={subItem.title}
                    onClick={(e) =>
                      handleSubmenuItemClick(item.title, subItem.url, e)
                    }
                    className={cn(
                      'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left w-full',
                      pathname.startsWith(subItem.url) &&
                        'bg-accent text-accent-foreground'
                    )}
                  >
                    {subItem.icon && <subItem.icon className='size-4' />}
                    {subItem.title}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          // Mobile or expanded desktop state: Show collapsible submenu
          <Collapsible
            asChild
            open={openItems.includes(item.title)}
            onOpenChange={() => handleToggle(item.title)}
            className='group/collapsible'
          >
            <div>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isParentActive}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith(subItem.url)}
                      >
                        <a href={subItem.url}>
                          {subItem.icon && <subItem.icon className='size-4' />}
                          <span>{subItem.title}</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      ) : (
        // Item without submenu
        <SidebarMenuButton
          asChild
          tooltip={item.title}
          isActive={pathname.startsWith(item.url)}
        >
          <a href={item.url}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
          </a>
        </SidebarMenuButton>
      )}
    </SidebarMenuItem>
  );
};

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      icon?: LucideIcon;
    }[];
  }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  // Initialize open items based on current pathname
  useEffect(() => {
    const initiallyOpen: string[] = [];

    items.forEach((item) => {
      if (item.items) {
        // Check if any sub-item matches current pathname
        const hasActiveSubItem = item.items.some(
          (subItem) =>
            pathname === subItem.url || pathname.startsWith(subItem.url + '/')
        );

        // Check if the main item URL matches
        const isMainItemActive =
          pathname === item.url || pathname.startsWith(item.url + '/');

        if (hasActiveSubItem || isMainItemActive || item.isActive) {
          initiallyOpen.push(item.title);
        }
      }
    });

    setOpenItems(initiallyOpen);
  }, [pathname, items]);

  const handleToggle = (itemTitle: string) => {
    setOpenItems((prev) => {
      // If the clicked item is already open, close it
      if (prev.includes(itemTitle)) {
        return prev.filter((title) => title !== itemTitle);
      }
      // Otherwise, close all other items and open only the clicked one
      return [itemTitle];
    });
  };

  const handlePopoverOpenChange = (itemTitle: string, open: boolean) => {
    setOpenPopovers((prev) => ({
      ...prev,
      [itemTitle]: open,
    }));
  };

  const handleSubmenuItemClick = (
    itemTitle: string,
    subItemUrl: string,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Close the popover
    setOpenPopovers((prev) => ({
      ...prev,
      [itemTitle]: false,
    }));

    // Navigate to the submenu item
    router.push(subItemUrl);
  };

  return (
    <SidebarGroup>
      {/* <SidebarGroupLabel>Others</SidebarGroupLabel> */}
      <SidebarMenu>
        {items.map((item) => (
          <NavItem
            key={item.title}
            item={item}
            openItems={openItems}
            handleToggle={handleToggle}
            openPopovers={openPopovers}
            handlePopoverOpenChange={handlePopoverOpenChange}
            handleSubmenuItemClick={handleSubmenuItemClick}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
