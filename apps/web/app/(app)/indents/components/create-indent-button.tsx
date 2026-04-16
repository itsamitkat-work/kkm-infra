'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { IconChevronDown, IconPlus } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface ProjectOption {
  id: string;
  name: string;
}

interface CreateIndentButtonProps {
  projectId: string | null;
  projects: ProjectOption[];
}

export function CreateIndentButton({
  projectId,
  projects,
}: CreateIndentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const handleSelect = React.useCallback(
    (projectUuid: string) => {
      setOpen(false);
      router.push(`/indents/create?projectId=${projectUuid}`);
    },
    [router]
  );

  const handlePrimaryClick = React.useCallback(() => {
    if (projectId) {
      router.push(`/indents/create?projectId=${projectId}`);
    } else {
      setOpen(true);
    }
  }, [projectId, router]);

  const selectedProjectName = projectId
    ? projects.find((p) => p.id === projectId)?.name
    : null;

  return (
    <div className='flex items-center'>
      <Button
        size='sm'
        variant='outline'
        onClick={handlePrimaryClick}
        className='rounded-r-none border-r-0'
      >
        <IconPlus className='h-4 w-4' />
        <span className='hidden lg:inline'>Create New Indent</span>
      </Button>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size='sm'
            variant='outline'
            className='rounded-l-none border-l-1 pl-2'
            aria-label='Choose project for new indent'
          >
            <IconChevronDown className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='end'
          className='w-[200px] p-0'
          sideOffset={4}
        >
          <Command>
            <CommandInput placeholder='Search project...' />
            <CommandList>
              <CommandEmpty>No project found.</CommandEmpty>
              {selectedProjectName && projectId && (
                <CommandGroup heading='Selected project'>
                  <CommandItem
                    value={selectedProjectName}
                    onSelect={() => handleSelect(projectId)}
                  >
                    Create for {selectedProjectName}
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup
                heading={selectedProjectName ? 'Other projects' : undefined}
              >
                {projects
                  .filter((p) => p.id !== projectId)
                  .map((project) => (
                    <CommandItem
                      key={project.id}
                      value={project.name}
                      onSelect={() => handleSelect(project.id)}
                    >
                      {project.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
