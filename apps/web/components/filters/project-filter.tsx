'use client';

import * as React from 'react';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { createFilter } from '@/components/ui/filters';
import type { FilterFieldConfig } from '@/components/ui/filters';
import { useProjects } from '@/hooks/projects/use-projects';
import { cn } from '@/lib/utils';

const PROJECT_FILTER_KEY = 'projectId';

export interface ProjectFilterSelectProps {
  value: string | undefined;
  onChange: (id: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

export function ProjectFilterSelect({
  value,
  onChange,
  placeholder = 'Select Project',
  searchPlaceholder = 'Search project...',
  className = 'h-7 text-sm border border-border bg-background hover:bg-secondary',
}: ProjectFilterSelectProps) {
  const { projects, isLoading } = useProjects();
  const [open, setOpen] = React.useState(false);

  const selectedProject = React.useMemo(() => {
    return projects.find((p) => p.id === value);
  }, [projects, value]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
  }

  function handleSelectProject(projectId: string) {
    onChange(projectId);
    setOpen(false);
  }

  function handleClearSelection() {
    onChange(null);
    setOpen(false);
  }

  return (
    <div className='min-w-[50px] max-w-[280px]'>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            disabled={isLoading}
            className={cn(
              'h-7 w-full min-w-0 justify-between gap-1 px-2 font-normal',
              className
            )}
          >
            <span className='truncate'>
              {selectedProject?.name ?? placeholder}
            </span>
            <IconChevronDown className='size-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='w-[var(--radix-popover-trigger-width)] max-w-[280px] p-0'
          align='start'
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>No project found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value='all projects clear filter'
                  onSelect={handleClearSelection}
                  className='text-muted-foreground'
                >
                  All projects
                </CommandItem>
                {projects.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.name} ${p.code ?? ''} ${p.id}`}
                    onSelect={() => {
                      handleSelectProject(p.id);
                    }}
                  >
                    <IconCheck
                      className={cn(
                        'mr-2 size-4 shrink-0',
                        value === p.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className='truncate'>{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export interface ProjectFilterFieldOptions {
  required?: boolean;
  label?: string;
}

export function getProjectFilterFieldConfig(
  options: ProjectFilterFieldOptions = {}
): FilterFieldConfig {
  const { required = false, label = 'Project' } = options;
  return {
    key: PROJECT_FILTER_KEY,
    label,
    type: 'custom',
    required,
    customRenderer: ({ values, onChange }) => (
      <ProjectFilterSelect
        value={values[0] as string | undefined}
        onChange={(id) => {
          onChange(id ? [id] : []);
        }}
      />
    ),
  };
}

export function createProjectFilterDefault() {
  return createFilter(PROJECT_FILTER_KEY, 'is', []);
}
