'use client';

import { TableLoadingState } from '@/components/tables/table-loading';
import { Button } from '@/components/ui/button';
import { StatusLabel } from '@/components/ui/status-label';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Calendar,
  MapPin,
  Wallet,
  XCircle,
  Edit,
  Tag,
  Hash,
  Code,
  Activity,
  Building,
  Building2,
  Receipt,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOpenClose } from '@/hooks/use-open-close';
import { ProjectDrawer } from '@/app/(app)/projects/components/project-drawer';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectSegmentSection } from './components/project-segment-section';
import type {
  ProjectDetail,
  ProjectDetailMember,
  ProjectsListRow,
} from '@/hooks/useProjects';
import {
  parseProjectMeta,
  projectDetailToListRow,
} from '@/hooks/useProjects';
import { projectStatusDisplayLabel } from '@/hooks/projects/use-project-status';
import { UserRoleType } from '@/app/(app)/user/types';

interface ProjectInfoTabProps {
  project: ProjectDetail | null | undefined;
  isLoading: boolean;
  isError: boolean;
}

const ROLE_LABEL: Record<UserRoleType, string> = {
  [UserRoleType.Verifier]: 'Measurement Verifier',
  [UserRoleType.Checker]: 'Measurement Checker',
  [UserRoleType.Maker]: 'Measurement Maker',
  [UserRoleType.ProjectHead]: 'Project Head',
  [UserRoleType.Engineer]: 'Project Engineer',
  [UserRoleType.Superviser]: 'Supervisor',
};

export function ProjectInfo({
  project,
  isLoading,
  isError,
}: ProjectInfoTabProps) {
  const projectDrawer = useOpenClose<ProjectsListRow | null>();
  const queryClient = useQueryClient();

  if (isLoading) {
    return <TableLoadingState />;
  }

  if (isError || !project) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center space-y-6'>
          <div className='relative'>
            <div className='h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center'>
              <XCircle className='h-8 w-8 text-destructive' />
            </div>
          </div>
          <div className='space-y-2'>
            <h3 className='text-lg font-semibold'>Could not load project</h3>
            <p className='text-sm text-muted-foreground max-w-md'>
              There was an error loading the project information. Please try
              refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const meta = parseProjectMeta(project.meta);
  const scheduleLabel =
    project.default_schedule_display_name ||
    meta.client_label ||
    '—';

  return (
    <div className='space-y-6'>
      <div className='flex justify-end'>
        <Button
          size='sm'
          onClick={() =>
            project && projectDrawer.open(projectDetailToListRow(project), 'edit')
          }
          className='h-8'
        >
          <Edit className='mr-2 h-4 w-4' />
          Edit Project
        </Button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <div className='border rounded-lg p-6 space-y-6'>
          <section>
            <div className='space-y-4'>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-semibold text-foreground'>
                  Basic Information
                </h3>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <InfoItem label='Project Name' icon={Tag}>
                  {project.name}
                </InfoItem>
                <InfoItem label='Project Code' icon={Code}>
                  {project.code ?? '—'}
                </InfoItem>
                <InfoItem label='Short Name' icon={Hash}>
                  {meta.short_name ?? '—'}
                </InfoItem>
                <InfoItem label='Sanction Amount' icon={Wallet}>
                  {formatCurrency(meta.sanction_amount ?? 0)}
                </InfoItem>
                <InfoItem label='Sanction DOS' icon={Calendar}>
                  {meta.sanction_dos ? formatDate(meta.sanction_dos) : '—'}
                </InfoItem>
                <InfoItem label='Sanction DOC' icon={Calendar}>
                  {meta.sanction_doc ? formatDate(meta.sanction_doc) : '—'}
                </InfoItem>
                <InfoItem label='Status' icon={Activity}>
                  <StatusLabel
                    status={projectStatusDisplayLabel(project.status)}
                  />
                </InfoItem>
              </div>
            </div>
          </section>

          <section className='pt-6 border-t border-border/50'>
            <div className='space-y-4'>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-semibold text-foreground'>
                  Location Details
                </h3>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <InfoItem label='Project Location' icon={MapPin}>
                  {meta.location || '—'}
                </InfoItem>
                <InfoItem label='Project City' icon={Building}>
                  {meta.city || '—'}
                </InfoItem>
              </div>
            </div>
          </section>

          <section className='pt-6 border-t border-border/50'>
            <div className='space-y-4'>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-semibold text-foreground'>
                  Client Information
                </h3>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <InfoItem label='Schedule / Client' icon={Building2}>
                  {scheduleLabel}
                </InfoItem>
                <InfoItem label='Client GSTIN No' icon={Receipt}>
                  {meta.client_gstn || '—'}
                </InfoItem>
              </div>
            </div>
          </section>

          <section className='pt-6 border-t border-border/50'>
            <div className='space-y-4'>
              <div className='flex items-center gap-2'>
                <h3 className='text-lg font-semibold text-foreground'>
                  Project Teams
                </h3>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {project.members_detail.map((m: ProjectDetailMember) => (
                  <TeamMember
                    key={`${m.role}-${m.user_id}`}
                    role={ROLE_LABEL[m.role]}
                    name={m.display_name}
                    userId={m.user_id}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        <div>
          <ProjectSegmentSection project={project} />
        </div>
      </div>

      {projectDrawer.isOpen && projectDrawer.mode && (
        <ProjectDrawer
          mode={projectDrawer.mode}
          project={projectDrawer.data || null}
          open={projectDrawer.isOpen}
          onSubmit={() => {
            projectDrawer.close();
            const id = projectDrawer.data?.id || project.id;
            if (id) {
              queryClient.invalidateQueries({ queryKey: ['project', id] });
            }
          }}
          onCancel={projectDrawer.close}
        />
      )}
    </div>
  );
}

interface InfoItemProps {
  label: string;
  children: React.ReactNode;
  icon?: React.ElementType;
}

function InfoItem({ label, children, icon: Icon }: InfoItemProps) {
  return (
    <div className='p-3 rounded-lg bg-card space-y-2'>
      <label className='text-xs font-medium text-muted-foreground flex items-center'>
        {Icon && <Icon className='mr-1.5 h-3.5 w-3.5' />}
        {label}
      </label>
      <div className='text-sm font-semibold text-foreground break-words'>
        {children}
      </div>
    </div>
  );
}

interface TeamMemberProps {
  role: string;
  name: string;
  userId: string;
  imageUrl?: string | null;
}

const roleColors: { [key: string]: string } = {
  Maker: 'bg-blue-100 text-blue-700',
  'Measurement Maker': 'bg-blue-100 text-blue-700',
  Checker: 'bg-yellow-100 text-yellow-700',
  'Measurement Checker': 'bg-yellow-100 text-yellow-700',
  Verifier: 'bg-green-100 text-green-700',
  'Measurement Verifier': 'bg-green-100 text-green-700',
  Supervisor: 'bg-purple-100 text-purple-700',
  Engineer: 'bg-indigo-100 text-indigo-700',
  'Project Engineer': 'bg-indigo-100 text-indigo-700',
  'Project Head': 'bg-pink-100 text-pink-700',
};

const getColorFromRole = (role: string) => {
  return roleColors[role] || 'bg-gray-100 text-gray-700';
};

const getInitials = (name: string) => {
  if (!name) return '?';
  const names = name.split(' ').filter(Boolean);
  if (names.length === 0) return '?';
  const firstInitial = names[0][0];
  const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
};

function TeamMember({ role, name, userId, imageUrl }: TeamMemberProps) {
  const colorClass = getColorFromRole(role);

  return (
    <Link href={`/user/${userId}`} className='block'>
      <div className='flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group'>
        <Avatar className='h-10 w-10'>
          <AvatarImage src={imageUrl ?? undefined} alt={name} />
          <AvatarFallback className={`${colorClass} text-xs font-semibold`}>
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors'>
            {name}
          </p>
          <p className='text-xs text-muted-foreground truncate'>{role}</p>
        </div>
        <ChevronRight className='h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0' />
      </div>
    </Link>
  );
}
