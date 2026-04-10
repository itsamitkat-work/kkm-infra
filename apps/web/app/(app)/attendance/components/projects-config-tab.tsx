'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  AttendanceTimeConfig,
  ProjectConfig,
  ProjectOverride,
} from '../config/attendance-config';
import {
  AssignedProjectType,
  useAssignedProjectsQuery,
} from '../../../../hooks/projects/use-assigned-projects-query';
import { useAuth } from '@/hooks/auth';
import { NumberInput, TimeInput } from '@/components/inputs';
import {
  useAttendanceConfig,
  useProjectConfig,
} from '../hooks/use-attendance-config';
import { IconChevronLeft } from '@tabler/icons-react';

interface Props {
  overrides: ProjectOverride[];
  globalDefaults?: AttendanceTimeConfig | null;
}

export function ProjectOverridesTab({ overrides, globalDefaults }: Props) {
  const { user } = useAuth();
  const {
    query: { isLoading },
    projects,
  } = useAssignedProjectsQuery(user?.hashId, AssignedProjectType.ForAttendance);

  const { updateProject, isUpdatingProject } = useAttendanceConfig();

  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(
    null
  );

  function handleSave(
    projectId: string,
    settings: Omit<ProjectConfig, 'projectId'>
  ) {
    updateProject(
      { projectId, config: settings },
      {
        onSuccess: () => {
          setEditingProjectId(null);
        },
      }
    );
  }

  function handleBack() {
    setEditingProjectId(null);
  }

  if (editingProjectId) {
    const selectedProject = projects.find((p) => p.hashId === editingProjectId);

    return (
      <OverrideEditor
        projectId={editingProjectId}
        projectName={selectedProject?.name}
        onBack={handleBack}
        onSave={handleSave}
        isPending={isUpdatingProject}
        globalDefaults={globalDefaults}
      />
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between px-1'>
        <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
          Assigned Projects
        </h4>
        <span className='text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full'>
          {projects.length} Total
        </span>
      </div>

      {isLoading ? (
        <div className='flex items-center justify-center py-12'>
          <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-primary'></div>
        </div>
      ) : projects.length === 0 ? (
        <div className='text-center py-8 border rounded-lg border-dashed bg-muted/20'>
          <p className='text-xs text-muted-foreground'>
            No projects assigned to you.
          </p>
        </div>
      ) : (
        <div className='grid gap-2'>
          {projects.map((project) => {
            const override = overrides.find(
              (o) => o.projectId === project.hashId
            );
            return (
              <div
                key={project.hashId}
                className='flex items-center justify-between p-2.5 sm:p-2 px-3 border rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-all group'
              >
                <div className='flex flex-col gap-0.5 min-w-0 flex-1 pr-2'>
                  <span className='text-sm font-medium leading-tight truncate'>
                    {project.name}
                  </span>
                  {override ? (
                    <div className='flex items-center gap-2 flex-wrap'>
                      <span className='text-[10px] font-medium text-primary px-1 bg-primary/10 rounded tracking-tight shrink-0'>
                        OVERRIDE
                      </span>
                      <span className='text-[10px] text-muted-foreground truncate'>
                        {override.idealInTime} - {override.idealOutTime} • ₹
                        {override.incentiveRatePerHour.overtime}/hr
                      </span>
                    </div>
                  ) : (
                    <span className='text-[10px] text-muted-foreground/60 italic'>
                      Using global defaults
                    </span>
                  )}
                </div>
                <Button
                  variant={override ? 'ghost' : 'outline'}
                  size='sm'
                  className='h-8 sm:h-7 text-xs px-3 sm:px-2.5 opacity-80 group-hover:opacity-100 transition-opacity'
                  onClick={() => setEditingProjectId(project.hashId)}
                >
                  {override ? 'Edit' : 'Configure'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface OverrideEditorProps {
  projectId: string | null;
  projectName?: string;
  onBack: () => void;
  onSave: (
    projectId: string,
    settings: Omit<ProjectConfig, 'projectId'>
  ) => void;
  isPending: boolean;
  globalDefaults?: AttendanceTimeConfig | null;
}

function OverrideEditor({
  projectId,
  projectName,
  onBack,
  onSave,
  isPending,
  globalDefaults,
}: OverrideEditorProps) {
  const { data: projectConfig, isLoading } = useProjectConfig(projectId);

  // Only editable settings: idealInTime, idealOutTime, incentiveRatePerHour
  const [settings, setSettings] = React.useState<
    Omit<ProjectConfig, 'projectId'>
  >({
    idealInTime: globalDefaults?.idealInTime ?? '09:00',
    idealOutTime: globalDefaults?.idealOutTime ?? '18:00',
    incentiveRatePerHour: globalDefaults?.incentiveRatePerHour ?? {
      overtime: 100,
      undertime: -50,
      nightShift: 0,
      weekend: 0,
      holiday: 0,
    },
  });

  // Inherited values (read-only, from global or project config)
  const inherited = React.useMemo(() => {
    if (projectConfig?.inherited) {
      return {
        ...projectConfig.inherited,
        // Ensure time format is HH:mm
        halfDaySplitTime:
          projectConfig.inherited.halfDaySplitTime?.substring(0, 5) ?? '13:00',
      };
    }
    const globalHalfDay = globalDefaults?.halfDaySplitTime ?? '13:00';
    return {
      halfDaySplitTime: globalHalfDay.substring(0, 5),
      gracePeriodMinutes: globalDefaults?.gracePeriodMinutes ?? 15,
      workingHoursPerDay: globalDefaults?.workingHoursPerDay ?? 8,
    };
  }, [projectConfig?.inherited, globalDefaults]);

  // Sync with fetched config
  React.useEffect(() => {
    if (projectConfig?.settings) {
      const newSettings = {
        idealInTime: projectConfig.settings.idealInTime.substring(0, 5),
        idealOutTime: projectConfig.settings.idealOutTime.substring(0, 5),
        incentiveRatePerHour: projectConfig.settings.incentiveRatePerHour,
      };
      setSettings(newSettings);
    }
  }, [projectConfig]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4 animate-in fade-in slide-in-from-right-2 duration-200'>
      <div className='flex items-center justify-between mb-1'>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={onBack}
            className='h-9 sm:h-7 px-2 -ml-2 text-muted-foreground hover:text-foreground'
          >
            <IconChevronLeft className='size-4 mr-0.5' />
            Back
          </Button>
          <h4 className='text-sm font-semibold truncate text-foreground'>
            {projectName ? projectName : 'Project Override'}
          </h4>
        </div>
        <Button
          size='sm'
          className='h-9 sm:h-8 text-xs px-4'
          onClick={() => {
            if (projectId) {
              onSave(projectId, settings);
            }
          }}
          disabled={!projectId || isPending}
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className='space-y-4'>
        <div>
          <h5 className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1 mb-3'>
            Project Settings (Editable)
          </h5>
          <div className='bg-muted/30 p-3 rounded-lg border border-border/50'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3'>
              <TimeInput
                id='p-in'
                label='Ideal In Time'
                value={settings.idealInTime}
                onChange={(v) => setSettings({ ...settings, idealInTime: v })}
              />
              <TimeInput
                id='p-out'
                label='Ideal Out Time'
                value={settings.idealOutTime}
                onChange={(v) => setSettings({ ...settings, idealOutTime: v })}
              />
            </div>
          </div>
          <div className='space-y-3'>
            <h5 className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1'>
              Incentive Rates (₹/hr)
            </h5>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
              <NumberInput
                id='p-overtime'
                label='Overtime'
                prefix='₹'
                value={settings.incentiveRatePerHour.overtime}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    incentiveRatePerHour: {
                      ...settings.incentiveRatePerHour,
                      overtime: v,
                    },
                  })
                }
              />
              <NumberInput
                id='p-undertime'
                label='Undertime'
                prefix='₹'
                value={settings.incentiveRatePerHour.undertime}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    incentiveRatePerHour: {
                      ...settings.incentiveRatePerHour,
                      undertime: v,
                    },
                  })
                }
              />
              <NumberInput
                id='p-night'
                label='Night'
                prefix='₹'
                value={settings.incentiveRatePerHour.nightShift}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    incentiveRatePerHour: {
                      ...settings.incentiveRatePerHour,
                      nightShift: v,
                    },
                  })
                }
              />
              <NumberInput
                id='p-weekend'
                label='Weekend'
                prefix='₹'
                value={settings.incentiveRatePerHour.weekend}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    incentiveRatePerHour: {
                      ...settings.incentiveRatePerHour,
                      weekend: v,
                    },
                  })
                }
              />
              <NumberInput
                id='p-holiday'
                label='Holiday'
                prefix='₹'
                value={settings.incentiveRatePerHour.holiday}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    incentiveRatePerHour: {
                      ...settings.incentiveRatePerHour,
                      holiday: v,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h5 className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1 mb-3'>
          Inherited from Global (Read-only)
        </h5>
        <div className='bg-muted/20 p-3 rounded-lg border border-border/30 border-dashed'>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3'>
            <div className='flex flex-col gap-1'>
              <label className='text-[10px] font-medium text-muted-foreground uppercase tracking-wider'>
                Half Day Split
              </label>
              <div className='text-sm font-medium text-foreground'>
                {inherited.halfDaySplitTime}
              </div>
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-[10px] font-medium text-muted-foreground uppercase tracking-wider'>
                Grace Period
              </label>
              <div className='text-sm font-medium text-foreground'>
                {inherited.gracePeriodMinutes} min
              </div>
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-[10px] font-medium text-muted-foreground uppercase tracking-wider'>
                Work Hours
              </label>
              <div className='text-sm font-medium text-foreground'>
                {inherited.workingHoursPerDay} hrs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
