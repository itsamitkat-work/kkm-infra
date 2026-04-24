'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO, isValid } from 'date-fns';
import { Form } from '@/components/ui/form';
import {
  FormInputField,
  FormDateField,
  FormSelectField,
  FormTextareaField,
  FormDrawerHeader,
  FormSection,
} from '@/components/form';
import {
  ProjectSegment,
  ProjectSegmentFormData,
  ProjectCreateSegmentData,
  PROJECT_SEGMENT_TYPE_PRESETS,
  ProjectSegmentStatus,
} from '@/types/projects';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  useCreateSegment,
  useUpdateSegment,
} from '../../hooks/use-segment-mutations';
import { OpenCloseMode } from '@/hooks/use-open-close';
import { Loader, ArrowRight } from 'lucide-react';
import { useProjectSegments } from '../../hooks/use-project-segments';
import { Button } from '@/components/ui/button';
import type { ProjectDetail } from '@/hooks/useProjects';
import { parseProjectMeta } from '@/hooks/useProjects';

const SEGMENT_TYPE_DATALIST_ID = 'project-segment-type-presets';

const SEGMENT_STATUS_OPTIONS: { value: ProjectSegmentStatus; label: string }[] =
  [
    { value: 'Draft', label: 'Draft' },
    { value: 'Active', label: 'Active' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Archived', label: 'Archived' },
  ];

const FORM_SCHEMA = z.object({
  segmentName: z.string().min(1, 'Segment name is required'),
  segmentType: z
    .string()
    .trim()
    .min(1, 'Segment type is required')
    .max(128, 'Segment type is too long'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['Draft', 'Active', 'Completed', 'Archived'], {
    message: 'Status is required',
  }),
  displayOrder: z
    .string()
    .min(1, 'Display order is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0,
      'Display order must be a valid number >= 0'
    ),
});

type SegmentFormValues = z.infer<typeof FORM_SCHEMA>;

interface Props {
  mode: OpenCloseMode;
  segment?: ProjectSegment | null;
  projectId: string;
  project?: ProjectDetail | null;
  open?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ProjectSegmentDrawer({
  mode,
  segment,
  projectId,
  project,
  onSubmit,
  onCancel,
  open,
}: Props) {
  const projectDatesMeta = React.useMemo(
    () => (project ? parseProjectMeta(project.meta) : null),
    [project]
  );

  const isEdit = mode === 'edit';
  const isRead = mode === 'read';

  const createSegmentMutation = useCreateSegment(projectId);
  const updateSegmentMutation = useUpdateSegment(projectId);
  const { segments, isLoading: segmentsLoading } =
    useProjectSegments(projectId);

  function formatDateString(dateString?: string | null): string {
    if (!dateString) return '';
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'yyyy-MM-dd') : '';
    } catch {
      return '';
    }
  }

  const getNextDisplayOrder = React.useCallback((): string => {
    if (!segments || segments.length === 0) {
      return '1';
    }
    const maxOrder = Math.max(...segments.map((s) => s.displayOrder));
    return String(maxOrder + 1);
  }, [segments]);

  const getInitialFormValues = React.useCallback(
    (
      mode: OpenCloseMode,
      segmentData: ProjectSegment | undefined
    ): SegmentFormValues => {
      if (mode === 'create') {
        return {
          segmentName: '',
          segmentType: 'Phase',
          description: '',
          startDate: '',
          endDate: '',
          status: 'Draft',
          displayOrder: getNextDisplayOrder(),
        };
      }

      if (segmentData) {
        return {
          segmentName: segmentData.segmentName || '',
          segmentType: segmentData.segmentType || 'Phase',
          description: segmentData.description || '',
          startDate: formatDateString(segmentData.startDate),
          endDate: formatDateString(segmentData.endDate),
          status: segmentData.status || 'Draft',
          displayOrder: String(segmentData.displayOrder || 1),
        };
      }

      return {
        segmentName: '',
        segmentType: 'Phase',
        description: '',
        startDate: '',
        endDate: '',
        status: 'Draft',
        displayOrder: '1',
      };
    },
    [getNextDisplayOrder]
  );

  const defaultValues: SegmentFormValues = React.useMemo(() => {
    return getInitialFormValues(mode, segment || undefined);
  }, [mode, segment, getInitialFormValues]);

  const form = useForm<SegmentFormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues,
    mode: 'all',
  });

  React.useEffect(() => {
    const formValues = getInitialFormValues(mode, segment || undefined);
    form.reset(formValues);
  }, [segment?.hashId, mode, getInitialFormValues, form, segment]);

  function handleApplyProjectDates() {
    if (!project) return;

    const meta = parseProjectMeta(project.meta);
    const projectStartDate = meta.sanction_dos
      ? formatDateString(meta.sanction_dos)
      : '';
    const projectEndDate = meta.sanction_doc
      ? formatDateString(meta.sanction_doc)
      : '';

    if (projectStartDate || projectEndDate) {
      form.setValue('startDate', projectStartDate, { shouldDirty: true });
      form.setValue('endDate', projectEndDate, { shouldDirty: true });
    }
  }

  function toISODateString(dateString: string | undefined): string | null {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      return isValid(date) ? date.toISOString() : null;
    } catch {
      return null;
    }
  }

  const handleSubmit = async (values: SegmentFormValues) => {
    try {
      const transformedData: ProjectSegmentFormData | ProjectCreateSegmentData =
        {
          ...(isEdit && segment ? { id: segment.hashId } : {}),
          projectId,
          segmentName: values.segmentName,
          segmentType: values.segmentType,
          description: values.description || null,
          startDate: toISODateString(values.startDate),
          endDate: toISODateString(values.endDate),
          status: values.status,
          displayOrder: Number(values.displayOrder),
        };

      if (isEdit) {
        await updateSegmentMutation.mutateAsync(
          transformedData as ProjectSegmentFormData
        );
      } else {
        await createSegmentMutation.mutateAsync(
          transformedData as ProjectCreateSegmentData
        );
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  if (segmentsLoading && mode === 'create') {
    return (
      <DrawerWrapper open={open} onClose={onCancel}>
        <DrawerHeader>
          <DrawerTitle>
            {isRead
              ? 'View Segment'
              : isEdit
                ? 'Edit Segment'
                : 'Create Segment'}
          </DrawerTitle>
        </DrawerHeader>
        <DrawerContentContainer>
          <div className='flex items-center justify-center py-12'>
            <Loader className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        </DrawerContentContainer>
      </DrawerWrapper>
    );
  }

  return (
    <DrawerWrapper open={open} onClose={onCancel}>
      <FormDrawerHeader
        title={
          isRead ? 'View Segment' : isEdit ? 'Edit Segment' : 'Create Segment'
        }
        submitButtonText={isEdit ? 'Save' : 'Create'}
        formId='segment-form'
        control={form.control}
        readOnly={isRead}
        isLoading={
          createSegmentMutation.isPending || updateSegmentMutation.isPending
        }
      />

      <DrawerContentContainer>
        <Form {...form}>
          <form
            id='segment-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='flex flex-col gap-6'
          >
            <FormInputField
              control={form.control}
              name='segmentName'
              label='Segment Name'
              placeholder='Enter segment name'
              required
              readOnly={isRead}
            />

            <div className='space-y-1.5'>
              <FormInputField
                control={form.control}
                name='segmentType'
                label='Segment Type'
                placeholder='Choose a preset or type a custom type'
                required
                readOnly={isRead}
                list={isRead ? undefined : SEGMENT_TYPE_DATALIST_ID}
              />
              {!isRead && (
                <datalist id={SEGMENT_TYPE_DATALIST_ID}>
                  {PROJECT_SEGMENT_TYPE_PRESETS.map((preset) => (
                    <option key={preset} value={preset} />
                  ))}
                </datalist>
              )}
              <p className='text-xs text-muted-foreground'>
                Suggestions include Phase, Tower, Floor, Area, Activity — or
                enter any label your project uses.
              </p>
            </div>

            <FormTextareaField
              control={form.control}
              name='description'
              label='Description'
              placeholder='Enter description (optional)'
              readOnly={isRead}
              rows={3}
            />

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>Dates</span>
                {!isRead &&
                  project &&
                  (projectDatesMeta?.sanction_dos ||
                    projectDatesMeta?.sanction_doc) && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={handleApplyProjectDates}
                      className='h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground'
                    >
                      <ArrowRight className='h-3 w-3 mr-1' />
                      Use sanction dates
                    </Button>
                  )}
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <FormDateField
                  control={form.control}
                  name='startDate'
                  label='Start Date'
                  readOnly={isRead}
                />

                <FormDateField
                  control={form.control}
                  name='endDate'
                  label='End Date'
                  readOnly={isRead}
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormSelectField
                control={form.control}
                name='status'
                label='Status'
                placeholder='Select status'
                options={SEGMENT_STATUS_OPTIONS}
                required
                readOnly={isRead}
              />

              <FormInputField
                control={form.control}
                name='displayOrder'
                label='Display Order'
                placeholder='Enter display order'
                required
                type='number'
                readOnly={isRead}
              />
            </div>
          </form>
        </Form>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}
