'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form } from '@/components/ui/form';
import {
  FormInputField,
  FormDrawerHeader,
  FormSection,
} from '@/components/form';
import { Client } from '@/hooks/clients/use-clients';
import { DrawerWrapper } from '@/components/drawer/drawer-wrapper';
import { DrawerContentContainer } from '@/components/drawer/drawer-content-container';
import {
  useCreateClient,
  useUpdateClient,
} from '@/hooks/clients/use-client-mutations';
import { OpenCloseMode } from '@/hooks/use-open-close';
import { Control } from 'react-hook-form';

const FORM_SCHEMA = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string(),
  contact: z.string(),
  web: z.string(),
  gstin: z.string(),
  scheduleName: z.string().min(1, 'Schedule name is required'),
  fullName: z.string(),
  area: z.string(),
  mdcontact: z.string(),
  cpcontact: z.string(),
});

type ClientFormValues = z.infer<typeof FORM_SCHEMA>;

interface Props {
  mode: OpenCloseMode;
  client?: Client | null;
  open?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ClientDrawer({
  mode,
  client,
  onSubmit,
  onCancel,
  open,
}: Props) {
  const isEdit = mode === 'edit';
  const isRead = mode === 'read';

  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();

  const getDefaultValues = React.useCallback((): ClientFormValues => {
    if (mode === 'create' || !client) {
      return {
        name: '',
        address: '',
        contact: '',
        web: '',
        gstin: '',
        scheduleName: '',
        fullName: '',
        area: '',
        mdcontact: '',
        cpcontact: '',
      };
    }

    return {
      name: client.name || '',
      address: client.address || '',
      contact: '',
      web: '',
      gstin: client.gstn || '',
      scheduleName: client.scheduleName || '',
      fullName: client.fullName || '',
      area: '',
      mdcontact: client.mdcontact || '',
      cpcontact: client.cpcontact || '',
    };
  }, [mode, client]);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: getDefaultValues(),
    mode: 'all',
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [client?.hashId, mode, getDefaultValues, form]);

  const handleSubmit = async (values: ClientFormValues) => {
    try {
      const data = {
        name: values.name,
        address: values.address || '',
        contact: values.contact || '',
        web: values.web || '',
        gstin: values.gstin || '',
        scheduleName: values.scheduleName,
        fullName: values.fullName || '',
        area: values.area || '',
        mdcontact: values.mdcontact || '',
        cpcontact: values.cpcontact || '',
      };

      if (isEdit) {
        await updateClientMutation.mutateAsync({
          ...data,
          hashId: client?.hashId || '',
        });
      } else {
        await createClientMutation.mutateAsync(data);
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

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
        isLoading={
          createClientMutation.isPending || updateClientMutation.isPending
        }
      />

      <DrawerContentContainer>
        <Form {...form}>
          <form
            id='client-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='flex flex-col gap-6'
          >
            <BasicInformationSection control={form.control} readOnly={isRead} />
            <ContactInformationSection
              control={form.control}
              readOnly={isRead}
            />
            <AdditionalInformationSection
              control={form.control}
              readOnly={isRead}
            />
          </form>
        </Form>
      </DrawerContentContainer>
    </DrawerWrapper>
  );
}

const BasicInformationSection = React.memo(
  ({
    control,
    readOnly,
  }: {
    control: Control<ClientFormValues>;
    readOnly: boolean;
  }) => (
    <FormSection title='Basic Information' showSeparator={false}>
      <FormInputField
        control={control}
        name='name'
        label='Name'
        placeholder='Enter client name'
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='fullName'
        label='Full Name'
        placeholder='Enter full name'
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='scheduleName'
        label='Schedule Name'
        placeholder='Enter schedule name'
        required
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='address'
        label='Address'
        placeholder='Enter address'
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='area'
        label='Area'
        placeholder='Enter area'
        readOnly={readOnly}
      />
    </FormSection>
  )
);

const ContactInformationSection = React.memo(
  ({
    control,
    readOnly,
  }: {
    control: Control<ClientFormValues>;
    readOnly: boolean;
  }) => (
    <FormSection title='Contact Information'>
      <FormInputField
        control={control}
        name='contact'
        label='Contact'
        placeholder='Enter contact number'
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='mdcontact'
        label='MD Contact'
        placeholder='Enter MD contact'
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='cpcontact'
        label='CP Contact'
        placeholder='Enter CP contact'
        readOnly={readOnly}
      />

      <FormInputField
        control={control}
        name='web'
        label='Web'
        placeholder='Enter website URL'
        readOnly={readOnly}
      />
    </FormSection>
  )
);

const AdditionalInformationSection = React.memo(
  ({
    control,
    readOnly,
  }: {
    control: Control<ClientFormValues>;
    readOnly: boolean;
  }) => (
    <FormSection title='Additional Information' showSeparator>
      <FormInputField
        control={control}
        name='gstin'
        label='GSTIN'
        placeholder='Enter GSTIN'
        readOnly={readOnly}
      />
    </FormSection>
  )
);

BasicInformationSection.displayName = 'BasicInformationSection';
ContactInformationSection.displayName = 'ContactInformationSection';
AdditionalInformationSection.displayName = 'AdditionalInformationSection';
