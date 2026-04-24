'use client';

import { TableLoadingState } from '@/components/tables/table-loading';
import { Button } from '@/components/ui/button';
import { StatusLabel } from '@/components/ui/status-label';
import { resolveProfileAvatarSrc } from '@/lib/profile-avatar';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { XCircle, Edit, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOpenClose } from '@/hooks/use-open-close';
import { ProjectDrawer } from '@/app/(app)/projects/components/project-drawer';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectSegmentSection } from './components/project-segment-section';
import { PROJECT_SEGMENTS_TABLE_ID } from '../hooks/use-project-segments-query';
import type {
  ProjectDetail,
  ProjectDetailMember,
  ProjectsListRow,
} from '@/hooks/useProjects';
import { parseProjectMeta, projectDetailToListRow } from '@/hooks/useProjects';
import { parseClientAddresses } from '@/app/(app)/clients/api/client-meta';
import { useClient } from '@/app/(app)/clients/hooks/use-client-detail-query';
import { billingSummaryForIndex } from '@/lib/client-address-display';
import { projectStatusDisplayLabel } from '@/hooks/projects/use-project-status';
import {
  PROJECT_TEAM_ESTIMATION_ROLES,
  PROJECT_TEAM_OPERATIONS_ROLES,
  PROJECT_TEAM_ROLE_LABELS,
  type ProjectMemberRoleSlug,
  useProjectMembersByRole,
} from '@/hooks/projects/use-project-member';
import { FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';

interface ProjectInfoTabProps {
  project: ProjectDetail | null | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function ProjectInfo({
  project,
  isLoading,
  isError,
}: ProjectInfoTabProps) {
  const projectDrawer = useOpenClose<ProjectsListRow | null>();
  const queryClient = useQueryClient();

  const memberByRole = useProjectMembersByRole(project?.members_detail);

  const billingClientId =
    project?.client_id && project.client_id.trim().length > 0
      ? project.client_id
      : undefined;
  const { client: billingClient } = useClient(billingClientId);

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
    project.default_schedule_display_name || meta.client_label || '—';

  const billingIndex = meta.client_billing_address_index ?? 0;
  const billingAddresses = parseClientAddresses(billingClient?.addresses);
  const billingLines = billingSummaryForIndex(
    billingAddresses,
    String(billingIndex)
  );

  return (
    <div className='space-y-4'>
      <div className='flex justify-end'>
        <Button
          size='sm'
          onClick={() =>
            project &&
            projectDrawer.open(projectDetailToListRow(project), 'edit')
          }
        >
          <Edit className='mr-1.5 h-3.5 w-3.5' />
          Edit Project
        </Button>
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <div className='rounded-lg border p-3'>
          <ItemGroup className='gap-3'>
            <section className='space-y-2'>
              <h3 className='text-sm font-semibold tracking-tight text-foreground'>
                Basic Information
              </h3>
              <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
                <InfoItem label='Project Name'>{project.name}</InfoItem>
                <InfoItem label='Project Code'>{project.code ?? '—'}</InfoItem>
                <InfoItem label='Short Name'>{meta.short_name ?? '—'}</InfoItem>
                <InfoItem label='Sanction Amount'>
                  {formatCurrency(meta.sanction_amount ?? 0)}
                </InfoItem>
                <InfoItem label='Sanction DOS'>
                  {meta.sanction_dos ? formatDate(meta.sanction_dos) : '—'}
                </InfoItem>
                <InfoItem label='Sanction DOC'>
                  {meta.sanction_doc ? formatDate(meta.sanction_doc) : '—'}
                </InfoItem>
                <InfoItem label='Status'>
                  <StatusLabel
                    status={projectStatusDisplayLabel(project.status)}
                  />
                </InfoItem>
              </div>
            </section>

            <section className='space-y-2'>
              <h3 className='text-sm font-semibold tracking-tight text-foreground'>
                Location Details
              </h3>
              <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
                <InfoItem label='Project Location'>
                  {meta.location || '—'}
                </InfoItem>
                <InfoItem label='Project City'>{meta.city || '—'}</InfoItem>
              </div>
            </section>

            <section className='space-y-2'>
              <h3 className='text-sm font-semibold tracking-tight text-foreground'>
                Client Information
              </h3>
              <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
                <InfoItem label='Schedule / Client'>{scheduleLabel}</InfoItem>
                <InfoItem label='Billing address'>
                  {billingClientId ? billingLines.addressLine : '—'}
                </InfoItem>
                <InfoItem label='Billing GSTIN'>
                  {billingClientId ? billingLines.gstin : '—'}
                </InfoItem>
              </div>
            </section>

            <section className='space-y-2'>
              <h3 className='text-sm font-semibold tracking-tight text-foreground'>
                Project Team
              </h3>
              <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
                <FieldSet
                  className={cn(
                    'gap-2 rounded-md border bg-muted/30 p-2.5',
                    '[&>[data-slot=field-legend]]:mb-0 [&>[data-slot=field-legend]]:text-xs'
                  )}
                >
                  <FieldLegend variant='legend'>Estimation</FieldLegend>
                  <FieldGroup className='gap-2'>
                    {PROJECT_TEAM_ESTIMATION_ROLES.map((slug) => (
                      <TeamRoleReadOnlyRow
                        key={slug}
                        slug={slug}
                        member={memberByRole.get(slug)}
                      />
                    ))}
                  </FieldGroup>
                </FieldSet>
                <FieldSet
                  className={cn(
                    'gap-2 rounded-md border bg-muted/30 p-2.5',
                    '[&>[data-slot=field-legend]]:mb-0 [&>[data-slot=field-legend]]:text-xs'
                  )}
                >
                  <FieldLegend variant='legend'>Operations</FieldLegend>
                  <FieldGroup className='gap-2'>
                    {PROJECT_TEAM_OPERATIONS_ROLES.map((slug) => (
                      <TeamRoleReadOnlyRow
                        key={slug}
                        slug={slug}
                        member={memberByRole.get(slug)}
                      />
                    ))}
                  </FieldGroup>
                </FieldSet>
              </div>
            </section>
          </ItemGroup>
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
              queryClient.invalidateQueries({
                queryKey: [PROJECT_SEGMENTS_TABLE_ID, id],
              });
              queryClient.invalidateQueries({
                queryKey: ['projectSegments', id],
              });
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
    <Item size='xs' className='items-start'>
      {Icon ? (
        <ItemMedia
          variant='icon'
          className="text-muted-foreground [&_svg:not([class*='size-'])]:size-3.5"
        >
          <Icon />
        </ItemMedia>
      ) : null}
      <ItemContent className='min-w-0 gap-0.5'>
        <ItemDescription className='text-[0.6875rem] font-medium leading-tight'>
          {label}
        </ItemDescription>
        <ItemTitle className='line-clamp-none whitespace-normal break-words text-xs font-semibold leading-snug text-foreground'>
          {children}
        </ItemTitle>
      </ItemContent>
    </Item>
  );
}

interface TeamMemberProps {
  role: string;
  name: string;
  userId: string;
  imageUrl?: string | null;
  roleSlug?: ProjectMemberRoleSlug;
}

const AVATAR_CLASS_BY_ROLE_SLUG: Record<ProjectMemberRoleSlug, string> = {
  project_maker: 'bg-blue-100 text-blue-700',
  project_checker: 'bg-yellow-100 text-yellow-700',
  project_verifier: 'bg-green-100 text-green-700',
  project_head: 'bg-pink-100 text-pink-700',
  project_engineer: 'bg-indigo-100 text-indigo-700',
  project_supervisor: 'bg-purple-100 text-purple-700',
};

const roleColors: { [key: string]: string } = {
  Maker: 'bg-blue-100 text-blue-700',
  'Measurement Maker': 'bg-blue-100 text-blue-700',
  'Project Maker': 'bg-blue-100 text-blue-700',
  Checker: 'bg-yellow-100 text-yellow-700',
  'Measurement Checker': 'bg-yellow-100 text-yellow-700',
  'Project Checker': 'bg-yellow-100 text-yellow-700',
  Verifier: 'bg-green-100 text-green-700',
  'Measurement Verifier': 'bg-green-100 text-green-700',
  'Project Verifier': 'bg-green-100 text-green-700',
  Supervisor: 'bg-purple-100 text-purple-700',
  Engineer: 'bg-indigo-100 text-indigo-700',
  'Project Engineer': 'bg-indigo-100 text-indigo-700',
  'Project Head': 'bg-pink-100 text-pink-700',
};

function getAvatarColorClass(
  role: string,
  roleSlug?: ProjectMemberRoleSlug
): string {
  if (roleSlug) {
    return AVATAR_CLASS_BY_ROLE_SLUG[roleSlug];
  }
  return roleColors[role] || 'bg-gray-100 text-gray-700';
}

const getInitials = (name: string) => {
  if (!name) return '?';
  const names = name.split(' ').filter(Boolean);
  if (names.length === 0) return '?';
  const firstInitial = names[0][0];
  const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
};

function TeamRoleReadOnlyRow({
  slug,
  member,
}: {
  slug: ProjectMemberRoleSlug;
  member: ProjectDetailMember | undefined;
}) {
  const label = PROJECT_TEAM_ROLE_LABELS[slug];
  if (member) {
    return (
      <TeamMember
        role={label}
        name={member.display_name}
        userId={member.user_id}
        imageUrl={member.avatar_url ?? null}
        roleSlug={slug}
      />
    );
  }
  return (
    <Item size='xs' className='border-dashed bg-muted/20 text-muted-foreground'>
      <ItemMedia variant='icon'>
        <span
          className='flex size-8 items-center justify-center rounded-full bg-muted text-[0.625rem] font-semibold'
          aria-hidden
        >
          —
        </span>
      </ItemMedia>
      <ItemContent className='min-w-0 gap-0'>
        <ItemTitle className='text-xs font-normal text-muted-foreground'>
          Not assigned
        </ItemTitle>
        <ItemDescription className='text-[0.6875rem] leading-tight'>
          {label}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}

function TeamMember({
  role,
  name,
  userId,
  imageUrl,
  roleSlug,
}: TeamMemberProps) {
  const colorClass = getAvatarColorClass(role, roleSlug);
  const avatarSrc = resolveProfileAvatarSrc(imageUrl);

  return (
    <Link
      href={`/user/${userId}`}
      className='block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
    >
      <Item
        size='xs'
        className='cursor-pointer transition-shadow hover:border-primary/40 hover:shadow-sm'
      >
        <ItemMedia variant='icon' className='self-center'>
          <Avatar className='h-8 w-8'>
            <AvatarImage src={avatarSrc} alt={name} />
            <AvatarFallback
              className={`${colorClass} text-[0.625rem] font-semibold`}
            >
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent className='min-w-0 gap-0'>
          <ItemTitle className='truncate text-xs transition-colors group-hover/item:text-primary'>
            {name}
          </ItemTitle>
          <ItemDescription className='truncate text-[0.6875rem] leading-tight'>
            {role}
          </ItemDescription>
        </ItemContent>
        <ItemActions className='shrink-0 self-center'>
          <ChevronRight className='h-3.5 w-3.5 text-muted-foreground transition-transform group-hover/item:translate-x-0.5 group-hover/item:text-primary' />
        </ItemActions>
      </Item>
    </Link>
  );
}
