'use client';

import * as React from 'react';
import { useForm, useFieldArray, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import {
  FormInputField,
  FormSelectField,
  FormTextareaField,
  FormDrawerHeader,
} from '@/components/form';
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
import { useInfiniteQuery } from '@tanstack/react-query';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { IconChevronDown, IconPlus, IconTrash } from '@tabler/icons-react';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldSeparator,
} from '@/components/ui/field';
import { getDirtyValues } from '@/lib/get-dirty-values';
import { fetchScheduleSourceOptions } from '@/hooks/schedules/use-schedule-sources';
import {
  RECORD_STATUS_OPTIONS,
  RecordStatusBadge,
} from '@/components/ui/record-status-badge';
import type { OpenCloseMode } from '@/hooks/use-open-close';
import {
  parseClientAddresses,
  parseClientContacts,
  parseClientMeta,
  type ClientsListRow,
  type ClientDetail,
  type ClientScheduleAssignment,
  useClient,
  useCreateClient,
  useUpdateClient,
} from '@/hooks/useClients';
import type {
  ClientAddress,
  ClientContact,
  ClientMeta,
} from '@/types/clients';
import { CLIENT_DB_STATUS } from '@/types/clients';

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const scheduleAssignmentSchema = z.object({
  schedule_source_id: z.string().min(1),
  display_name: z.string(),
  is_default: z.boolean(),
});

const addressSchema = z.object({
  line1: z.string(),
  line2: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  country: z.string(),
  type: z.string(),
});

const contactSchema = z.object({
  position: z.string(),
  name: z.string(),
  mobile: z.string(),
  email: z
    .string()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      'Invalid email'
    ),
});

const STATUS_FORM_VALUES = ['Active', 'Inactive'] as const;

const FORM_SCHEMA = z.object({
  display_name: z.string().min(1, 'Display name is required'),
  full_name: z.string(),
  gstin: z
    .string()
    .refine(
      (val) => !val || GSTIN_REGEX.test(val),
      'Invalid GSTIN format. E.g., 22AAAAA0000A1Z5'
    ),
  status: z.enum(STATUS_FORM_VALUES),
  schedules: z
    .array(scheduleAssignmentSchema)
    .refine(
      (rows) => rows.filter((r) => r.is_default).length <= 1,
      'Only one schedule can be marked as default.'
    ),
  notes: z.string(),
  addresses: z.array(addressSchema),
  contacts: z.array(contactSchema),
});

type ClientFormValues = z.infer<typeof FORM_SCHEMA>;

const STATUS_SELECT_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

function formStatusToDb(label: string): string {
  return label === 'Inactive'
    ? CLIENT_DB_STATUS.INACTIVE
    : CLIENT_DB_STATUS.ACTIVE;
}

function dbStatusToForm(status: string | null | undefined): 'Active' | 'Inactive' {
  return status === 'inactive' ? 'Inactive' : 'Active';
}

function emptyAddress(): z.infer<typeof addressSchema> {
  return {
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
    type: '',
  };
}

function emptyContact(): z.infer<typeof contactSchema> {
  return { position: '', name: '', mobile: '', email: '' };
}

function addressesToForm(
  rows: ClientAddress[]
): z.infer<typeof addressSchema>[] {
  return rows.map((row) => ({
    line1: row.line1 ?? '',
    line2: row.line2 ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    pincode: row.pincode ?? '',
    country: row.country ?? '',
    type: row.type ?? '',
  }));
}

function contactsToForm(
  rows: ClientContact[]
): z.infer<typeof contactSchema>[] {
  return rows.map((row) => ({
    position: row.position ?? '',
    name: row.name ?? '',
    mobile: row.mobile ?? '',
    email: row.email ?? '',
  }));
}

function schedulesFromDetail(
  detail: ClientDetail
): z.infer<typeof scheduleAssignmentSchema>[] {
  return (detail.client_schedules ?? [])
    .filter((row) => row.is_active)
    .map((row) => ({
      schedule_source_id: row.schedule_source_id,
      display_name:
        row.schedule_sources?.display_name ??
        row.schedule_sources?.name ??
        'Unknown schedule',
      is_default: Boolean(row.is_default),
    }));
}

function schedulesFromListRow(
  row: ClientsListRow
): z.infer<typeof scheduleAssignmentSchema>[] {
  if (!row.default_schedule_source_id) return [];
  return [
    {
      schedule_source_id: row.default_schedule_source_id,
      display_name: row.default_schedule_display_name ?? 'Unknown schedule',
      is_default: true,
    },
  ];
}

function emptyFormValues(): ClientFormValues {
  return {
    display_name: '',
    full_name: '',
    gstin: '',
    status: 'Active',
    schedules: [],
    notes: '',
    addresses: [],
    contacts: [],
  };
}

function detailToFormValues(detail: ClientDetail): ClientFormValues {
  const meta = parseClientMeta(detail.meta);
  return {
    display_name: detail.display_name ?? '',
    full_name: detail.full_name ?? '',
    gstin: detail.gstin ?? '',
    status: dbStatusToForm(detail.status),
    schedules: schedulesFromDetail(detail),
    notes: (meta.notes as string | null | undefined) ?? '',
    addresses: addressesToForm(parseClientAddresses(detail.addresses)),
    contacts: contactsToForm(parseClientContacts(detail.contacts)),
  };
}

function listRowToFormValues(row: ClientsListRow): ClientFormValues {
  const meta = parseClientMeta(row.meta);
  return {
    display_name: row.display_name ?? '',
    full_name: row.full_name ?? '',
    gstin: row.gstin ?? '',
    status: dbStatusToForm(row.status),
    schedules: schedulesFromListRow(row),
    notes: (meta.notes as string | null | undefined) ?? '',
    addresses: addressesToForm(parseClientAddresses(row.addresses)),
    contacts: contactsToForm(parseClientContacts(row.contacts)),
  };
}

function formValuesToAddresses(
  rows: ClientFormValues['addresses']
): ClientAddress[] {
  return rows.map((row) => ({
    line1: row.line1 || null,
    line2: row.line2 || null,
    city: row.city || null,
    state: row.state || null,
    pincode: row.pincode || null,
    country: row.country || null,
    type: row.type || null,
  }));
}

function formValuesToContacts(
  rows: ClientFormValues['contacts']
): ClientContact[] {
  return rows.map((row) => ({
    position: row.position || null,
    name: row.name || null,
    mobile: row.mobile || null,
    email: row.email || null,
  }));
}

function buildMetaFromValues(values: ClientFormValues): ClientMeta {
  return { notes: values.notes?.trim() ? values.notes.trim() : null };
}

function formValuesToSchedules(
  rows: ClientFormValues['schedules']
): ClientScheduleAssignment[] {
  return rows.map((row) => ({
    schedule_source_id: row.schedule_source_id,
    is_default: row.is_default,
  }));
}

function recordStatusSelectOption(option: { value: string; label: string }) {
  return (
    <RecordStatusBadge
      status={option.value === 'Inactive' ? 'inactive' : 'active'}
    />
  );
}

function recordStatusSelectValue(value: string) {
  return (
    <RecordStatusBadge status={value === 'Inactive' ? 'inactive' : 'active'} />
  );
}

interface Props {
  mode: OpenCloseMode;
  client?: ClientsListRow | null;
  open?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ClientDrawer({
  mode,
  client,
  open,
  onSubmit,
  onCancel,
}: Props) {
  const isEdit = mode === 'edit';
  const isRead = mode === 'read';
  const isCopy = mode === 'create' && !!client;

  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();

  const detailId = !isCopy && client?.id ? client.id : undefined;
  const {
    client: clientDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = useClient(detailId);

  const statusOptions = React.useMemo(
    () =>
      RECORD_STATUS_OPTIONS.filter(
        (o) => o.value === 'Active' || o.value === 'Inactive'
      ),
    []
  );

  const getDefaultValues = React.useCallback((): ClientFormValues => {
    if (mode === 'create' && !isCopy) return emptyFormValues();
    if (clientDetail) return detailToFormValues(clientDetail);
    if (client) return listRowToFormValues(client);
    return emptyFormValues();
  }, [mode, isCopy, clientDetail, client]);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    mode: 'all',
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [clientDetail?.id, mode, getDefaultValues, form]);

  const handleSubmit = async (values: ClientFormValues) => {
    try {
      if (isEdit && clientDetail) {
        const dirty = getDirtyValues(values, form.formState.dirtyFields);
        if (Object.keys(dirty).length === 0) {
          toast.message('No changes to save');
          return;
        }

        const metaDirty = 'notes' in dirty;
        const addressesDirty = 'addresses' in dirty;
        const contactsDirty = 'contacts' in dirty;
        const schedulesDirty = 'schedules' in dirty;

        await updateClientMutation.mutateAsync({
          clientId: clientDetail.id,
          ...('display_name' in dirty
            ? { display_name: values.display_name }
            : {}),
          ...('full_name' in dirty
            ? { full_name: values.full_name?.trim() || null }
            : {}),
          ...('gstin' in dirty
            ? { gstin: values.gstin?.trim() || null }
            : {}),
          ...('status' in dirty
            ? { status: formStatusToDb(values.status) }
            : {}),
          ...(addressesDirty
            ? { addresses: formValuesToAddresses(values.addresses) }
            : {}),
          ...(contactsDirty
            ? { contacts: formValuesToContacts(values.contacts) }
            : {}),
          ...(metaDirty
            ? {
                metaPatch: buildMetaFromValues(values),
                baseMeta: clientDetail.meta,
              }
            : {}),
          ...(schedulesDirty
            ? { schedules: formValuesToSchedules(values.schedules) }
            : {}),
        });
      } else {
        await createClientMutation.mutateAsync({
          display_name: values.display_name,
          full_name: values.full_name?.trim() || null,
          gstin: values.gstin?.trim() || null,
          status: formStatusToDb(values.status),
          meta: buildMetaFromValues(values),
          addresses: formValuesToAddresses(values.addresses),
          contacts: formValuesToContacts(values.contacts),
          schedules: formValuesToSchedules(values.schedules),
        });
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting client form:', error);
    }
  };

  const showDetailLoading = Boolean(detailId) && isDetailLoading && !clientDetail;
  const showDetailError = Boolean(detailId) && isDetailError && !clientDetail;

  return (
    <DrawerWrapper open={open} onClose={onCancel}>
      <FormDrawerHeader
        title={
          isRead ? 'View Client' : isEdit ? 'Edit Client' : 'Create Client'
        }
        submitButtonText={isEdit ? 'Save' : 'Create'}
        formId='client-form'
        control={form.control}
        readOnly={isRead}
        allowSubmitWhenNotDirty={isCopy}
        isLoading={
          createClientMutation.isPending || updateClientMutation.isPending
        }
      />

      <DrawerContentContainer>
        {showDetailLoading ? (
          <div className='py-8 text-center text-sm text-muted-foreground'>
            Loading client…
          </div>
        ) : showDetailError ? (
          <div className='py-8 text-center text-sm text-destructive'>
            Failed to load client details.
          </div>
        ) : (
          <form id='client-form' onSubmit={form.handleSubmit(handleSubmit)}>
            <FieldGroup density='dense'>
              <BasicInformationSection
                control={form.control}
                readOnly={isRead}
                statusOptions={STATUS_SELECT_OPTIONS.length > 0 ? STATUS_SELECT_OPTIONS : statusOptions}
              />
              <SchedulesSection control={form.control} readOnly={isRead} />
              <AddressesSection control={form.control} readOnly={isRead} />
              <ContactsSection control={form.control} readOnly={isRead} />
              <NotesSection control={form.control} readOnly={isRead} />
            </FieldGroup>
          </form>
        )}
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}

const BasicInformationSection = React.memo(
  ({
    control,
    readOnly,
    statusOptions,
  }: {
    control: Control<ClientFormValues>;
    readOnly: boolean;
    statusOptions: Array<{ value: string; label: string }>;
  }) => (
    <FieldSet>
      <FieldLegend variant='label'>Basic Information</FieldLegend>
      <FormInputField
        control={control}
        name='display_name'
        label='Display Name'
        placeholder='e.g. Acme Infra'
        required
        readOnly={readOnly}
      />
      <FormInputField
        control={control}
        name='full_name'
        label='Full Name'
        placeholder='Legal / full name'
        readOnly={readOnly}
      />
      <FormInputField
        control={control}
        name='gstin'
        label='GSTIN'
        placeholder='22AAAAA0000A1Z5'
        readOnly={readOnly}
      />
      <FormSelectField
        control={control}
        name='status'
        label='Status'
        placeholder='Select status'
        options={statusOptions}
        required
        readOnly={readOnly}
        renderOption={recordStatusSelectOption}
        renderValue={recordStatusSelectValue}
      />
    </FieldSet>
  )
);

BasicInformationSection.displayName = 'BasicInformationSection';

function AddressesSection({
  control,
  readOnly,
}: {
  control: Control<ClientFormValues>;
  readOnly: boolean;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'addresses',
  });

  function handleAddAddress() {
    append(emptyAddress());
  }

  return (
    <FieldSet>
      <div className='flex items-center justify-between'>
        <FieldLegend variant='label'>Addresses</FieldLegend>
        {!readOnly && (
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={handleAddAddress}
          >
            <IconPlus className='size-4' />
            Add Address
          </Button>
        )}
      </div>

      {fields.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          No addresses added yet.
        </p>
      ) : (
        fields.map((fieldItem, index) => (
          <AddressRow
            key={fieldItem.id}
            control={control}
            index={index}
            readOnly={readOnly}
            onRemove={() => remove(index)}
            showSeparator={index > 0}
          />
        ))
      )}
    </FieldSet>
  );
}

function AddressRow({
  control,
  index,
  readOnly,
  onRemove,
  showSeparator,
}: {
  control: Control<ClientFormValues>;
  index: number;
  readOnly: boolean;
  onRemove: () => void;
  showSeparator: boolean;
}) {
  return (
    <div className='flex flex-col gap-3'>
      {showSeparator && <FieldSeparator />}
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-muted-foreground'>
          Address {index + 1}
        </span>
        {!readOnly && (
          <Button
            type='button'
            size='icon'
            variant='ghost'
            onClick={onRemove}
            aria-label='Remove address'
          >
            <IconTrash className='size-4' />
          </Button>
        )}
      </div>
      <FormInputField
        control={control}
        name={`addresses.${index}.type`}
        label='Type'
        placeholder='e.g. HQ, Billing, Site'
        readOnly={readOnly}
      />
      <FormInputField
        control={control}
        name={`addresses.${index}.line1`}
        label='Line 1'
        placeholder='Street / building'
        readOnly={readOnly}
      />
      <FormInputField
        control={control}
        name={`addresses.${index}.line2`}
        label='Line 2'
        placeholder='Area / landmark'
        readOnly={readOnly}
      />
      <div className='grid grid-cols-2 gap-3'>
        <FormInputField
          control={control}
          name={`addresses.${index}.city`}
          label='City'
          placeholder='City'
          readOnly={readOnly}
        />
        <FormInputField
          control={control}
          name={`addresses.${index}.state`}
          label='State'
          placeholder='State'
          readOnly={readOnly}
        />
      </div>
      <div className='grid grid-cols-2 gap-3'>
        <FormInputField
          control={control}
          name={`addresses.${index}.pincode`}
          label='Pincode'
          placeholder='Pincode'
          readOnly={readOnly}
        />
        <FormInputField
          control={control}
          name={`addresses.${index}.country`}
          label='Country'
          placeholder='Country'
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

function ContactsSection({
  control,
  readOnly,
}: {
  control: Control<ClientFormValues>;
  readOnly: boolean;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'contacts',
  });

  function handleAddContact() {
    append(emptyContact());
  }

  return (
    <FieldSet>
      <div className='flex items-center justify-between'>
        <FieldLegend variant='label'>Contacts</FieldLegend>
        {!readOnly && (
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={handleAddContact}
          >
            <IconPlus className='size-4' />
            Add Contact
          </Button>
        )}
      </div>

      {fields.length === 0 ? (
        <p className='text-sm text-muted-foreground'>No contacts added yet.</p>
      ) : (
        fields.map((fieldItem, index) => (
          <ContactRow
            key={fieldItem.id}
            control={control}
            index={index}
            readOnly={readOnly}
            onRemove={() => remove(index)}
            showSeparator={index > 0}
          />
        ))
      )}
    </FieldSet>
  );
}

function ContactRow({
  control,
  index,
  readOnly,
  onRemove,
  showSeparator,
}: {
  control: Control<ClientFormValues>;
  index: number;
  readOnly: boolean;
  onRemove: () => void;
  showSeparator: boolean;
}) {
  return (
    <div className='flex flex-col gap-3'>
      {showSeparator && <FieldSeparator />}
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-muted-foreground'>
          Contact {index + 1}
        </span>
        {!readOnly && (
          <Button
            type='button'
            size='icon'
            variant='ghost'
            onClick={onRemove}
            aria-label='Remove contact'
          >
            <IconTrash className='size-4' />
          </Button>
        )}
      </div>
      <FormInputField
        control={control}
        name={`contacts.${index}.name`}
        label='Name'
        placeholder='Full name'
        readOnly={readOnly}
      />
      <FormInputField
        control={control}
        name={`contacts.${index}.position`}
        label='Position'
        placeholder='e.g. Director, Accounts'
        readOnly={readOnly}
      />
      <div className='grid grid-cols-2 gap-3'>
        <FormInputField
          control={control}
          name={`contacts.${index}.mobile`}
          label='Mobile'
          placeholder='Mobile number'
          readOnly={readOnly}
        />
        <FormInputField
          control={control}
          name={`contacts.${index}.email`}
          label='Email'
          placeholder='name@example.com'
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

function NotesSection({
  control,
  readOnly,
}: {
  control: Control<ClientFormValues>;
  readOnly: boolean;
}) {
  return (
    <FieldSet>
      <FieldLegend variant='label'>Notes</FieldLegend>
      <FormTextareaField
        control={control}
        name='notes'
        label='Internal Notes'
        placeholder='Any internal notes about this client'
        rows={3}
        readOnly={readOnly}
      />
    </FieldSet>
  );
}

function SchedulesSection({
  control,
  readOnly,
}: {
  control: Control<ClientFormValues>;
  readOnly: boolean;
}) {
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'schedules',
  });

  const existingIds = React.useMemo(
    () => fields.map((f) => f.schedule_source_id),
    [fields]
  );

  function handleAddSchedule(scheduleSourceId: string, displayName: string) {
    if (existingIds.includes(scheduleSourceId)) {
      toast.error('This schedule is already assigned.');
      return;
    }
    append({
      schedule_source_id: scheduleSourceId,
      display_name: displayName,
      is_default: fields.length === 0,
    });
  }

  function handleSetDefault(scheduleSourceId: string) {
    replace(
      fields.map((f) => ({
        schedule_source_id: f.schedule_source_id,
        display_name: f.display_name,
        is_default: f.schedule_source_id === scheduleSourceId,
      }))
    );
  }

  const currentDefaultId =
    fields.find((f) => f.is_default)?.schedule_source_id ?? '';

  return (
    <FieldSet>
      <div className='flex items-center justify-between'>
        <FieldLegend variant='label'>Schedules</FieldLegend>
        {!readOnly && (
          <AddScheduleCombobox
            excludeIds={existingIds}
            onAdd={handleAddSchedule}
          />
        )}
      </div>

      {fields.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          No schedules assigned yet.
        </p>
      ) : (
        <RadioGroup
          value={currentDefaultId}
          onValueChange={handleSetDefault}
          disabled={readOnly}
          className='flex flex-col gap-2'
        >
          {fields.map((fieldItem, index) => (
            <div
              key={fieldItem.id}
              className='flex items-center gap-3 rounded-md border px-3 py-2'
            >
              <RadioGroupItem
                value={fieldItem.schedule_source_id}
                id={`schedule-${fieldItem.id}`}
              />
              <Label
                htmlFor={`schedule-${fieldItem.id}`}
                className='flex-1 truncate font-normal'
              >
                {fieldItem.display_name}
                {fieldItem.is_default && (
                  <span className='ml-2 text-xs text-muted-foreground'>
                    (default)
                  </span>
                )}
              </Label>
              {!readOnly && (
                <Button
                  type='button'
                  size='icon'
                  variant='ghost'
                  onClick={() => remove(index)}
                  aria-label='Remove schedule'
                >
                  <IconTrash className='size-4' />
                </Button>
              )}
            </div>
          ))}
        </RadioGroup>
      )}
    </FieldSet>
  );
}

function AddScheduleCombobox({
  excludeIds,
  onAdd,
}: {
  excludeIds: string[];
  onAdd: (scheduleSourceId: string, displayName: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const { debouncedSearchTerm, setSearchTerm } = useDebouncedSearch(300);

  const {
    data,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['client-schedule-picker', debouncedSearchTerm],
    queryFn: ({ pageParam = 1 }) =>
      fetchScheduleSourceOptions(debouncedSearchTerm, pageParam as number),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasNextPage ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    enabled: open,
  });

  const allOptions = React.useMemo(
    () => data?.pages.flatMap((page) => page.options) ?? [],
    [data]
  );

  const availableOptions = React.useMemo(
    () => allOptions.filter((opt) => !excludeIds.includes(opt.value)),
    [allOptions, excludeIds]
  );

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (
      scrollTop + clientHeight >= scrollHeight - 20 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll, open]);

  function handleSelect(value: string) {
    const option = availableOptions.find((o) => o.value === value);
    if (!option) return;
    onAdd(option.value, option.label);
    setOpen(false);
    setSearchTerm('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type='button' size='sm' variant='outline'>
          <IconPlus className='size-4' />
          Add Schedule
          <IconChevronDown className='size-4 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[320px] p-0' align='end'>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder='Search schedules…'
            onValueChange={setSearchTerm}
            isLoading={isFetching && !isFetchingNextPage}
          />
          <CommandList
            className='max-h-[280px]'
            ref={scrollContainerRef}
          >
            {isFetching && allOptions.length === 0 ? (
              <div className='py-6 text-center text-sm text-muted-foreground'>
                Loading…
              </div>
            ) : (
              <>
                <CommandEmpty>No schedules found</CommandEmpty>
                <CommandGroup>
                  {availableOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={handleSelect}
                    >
                      <span className='truncate'>{option.label}</span>
                    </CommandItem>
                  ))}
                  {isFetchingNextPage && (
                    <div className='py-2 text-center text-sm text-muted-foreground'>
                      Loading more…
                    </div>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
