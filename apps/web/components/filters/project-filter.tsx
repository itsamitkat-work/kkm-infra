'use client';

import React from 'react';
import { Combobox } from '@/components/ui/combobox';
import { useProjects } from '@/hooks/projects/use-projects';
import type { FilterFieldConfig } from '@/components/ui/filters';
import { createFilter } from '@/components/ui/filters';

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
  const { projects } = useProjects();

  return (
    <div className='min-w-[50px] max-w-[280px]'>
      <Combobox
        options={projects}
        value={value ?? null}
        onChange={onChange}
        getOptionId={(p) => p.id}
        getOptionLabel={(p) => p.name}
        placeholder={placeholder}
        className={className}
        searchPlaceholder={searchPlaceholder}
      />
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
        onChange={(id) => onChange(id ? [id] : [])}
      />
    ),
  };
}

export function createProjectFilterDefault() {
  return createFilter(PROJECT_FILTER_KEY, 'is', []);
}
