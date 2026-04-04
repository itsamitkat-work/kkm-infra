'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  IconCircleX,
  IconUser,
  IconCash,
  IconBuildingBank,
  IconArrowLeft,
} from '@tabler/icons-react';
import { use, useState } from 'react';
import { useEmployee } from './hooks/use-employee-detail';
import { TableLoadingState } from '@/components/tables/table-loading';
import { EmployeeOverview } from './components/employee-overview';
import { SalaryModule } from './components/salary-module';
import { BankModule } from './components/bank-module';
import { useOpenClose } from '@/hooks/use-open-close';
import { Employee } from '@/app/(app)/hr/employees/types/employee';
import { useQueryClient } from '@tanstack/react-query';
import { ReactQueryProvider } from '@/app/react-query-provider';
import { EmployeeDrawer } from '@/app/(app)/hr/employees/components/employee-drawer';

interface EmployeeDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

const TAB_CONFIG = [
  {
    id: 'overview',
    label: 'Overview',
    mobileLabel: 'Overview',
    icon: IconUser,
  },
  {
    id: 'salary',
    label: 'Salary Details',
    mobileLabel: 'Salary',
    icon: IconCash,
  },
  {
    id: 'bank',
    label: 'Bank Accounts',
    mobileLabel: 'Bank',
    icon: IconBuildingBank,
  },
];

function EmployeeDetailContent({ params }: EmployeeDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const queryClient = useQueryClient();

  const { data: employee, isLoading, isError } = useEmployee(resolvedParams.id);
  const employeeDrawer = useOpenClose<Employee>();

  const getInitialTab = () => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && TAB_CONFIG.some((tab) => tab.id === tabFromUrl)) {
      return tabFromUrl;
    }
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  function handleBack() {
    router.push('/hr');
  }

  function handleTabChange(value: string) {
    setActiveTab(value);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('tab', value);
    router.push(
      `/hr/employees/${resolvedParams.id}?${newSearchParams.toString()}`,
      { scroll: false }
    );
  }

  function handleEditEmployee() {
    if (employee) {
      employeeDrawer.open(employee, 'edit');
    }
  }

  function renderTabContent() {
    if (!employee) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <EmployeeOverview employee={employee} onEdit={handleEditEmployee} />
        );
      case 'salary':
        return <SalaryModule employeeId={resolvedParams.id} />;
      case 'bank':
        return (
          <BankModule
            employeeId={resolvedParams.id}
            employeeName={employee.name}
          />
        );
      default:
        return (
          <EmployeeOverview employee={employee} onEdit={handleEditEmployee} />
        );
    }
  }

  if (isLoading) {
    return <TableLoadingState />;
  }

  if (isError || !employee) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-center space-y-6'>
          <div className='relative'>
            <div className='h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center'>
              <IconCircleX className='h-8 w-8 text-destructive' />
            </div>
          </div>
          <div className='space-y-2'>
            <h3 className='text-lg font-semibold'>Employee Not Found</h3>
            <p className='text-sm text-muted-foreground max-w-md'>
              The employee you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have permission to view it.
            </p>
          </div>
          <Button onClick={handleBack} variant='outline' className='mt-4'>
            Go Back to HR
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background flex flex-col w-full'>
      {/* Page Header with Breadcrumb */}
      <div className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='flex items-center justify-between px-6 py-4'>
          <div className='flex items-center gap-4'>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleBack}
              className='flex items-center gap-2 text-muted-foreground hover:text-foreground'
            >
              <IconArrowLeft className='size-4' />
              Back
            </Button>

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href='/hr'>HR</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/hr/employees/${employee.id}`}>
                    {employee.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {TAB_CONFIG.find((tab) => tab.id === activeTab)?.label ||
                      'Overview'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className='flex-1 overflow-auto bg-muted/20 p-0'>
        <Card className='@container/card border-0 rounded-none m-0 gap-0'>
          <CardHeader>
            <div className='flex justify-end'>
              <ToggleGroup
                type='single'
                value={activeTab}
                onValueChange={(value) => value && handleTabChange(value)}
                variant='outline'
                size='sm'
                className='flex flex-wrap *:data-[slot=toggle-group-item]:!px-4'
              >
                {TAB_CONFIG.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <ToggleGroupItem
                      key={tab.id}
                      value={tab.id}
                      className='flex items-center gap-2 px-3 py-2 min-w-fit whitespace-nowrap'
                    >
                      <IconComponent className='size-4 flex-shrink-0' />
                      <span className='hidden sm:inline text-sm'>
                        {tab.label}
                      </span>
                      <span className='sm:hidden text-sm'>
                        {tab.mobileLabel}
                      </span>
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>
          </CardHeader>
          <CardContent className='px-4 pt-2 sm:px-6 sm:pt-3'>
            {renderTabContent()}
          </CardContent>
        </Card>
      </div>

      {/* Employee Drawer */}
      {employeeDrawer.isOpen && employeeDrawer.mode && (
        <EmployeeDrawer
          mode={employeeDrawer.mode}
          employee={employeeDrawer.data || null}
          open={employeeDrawer.isOpen}
          onSubmit={() => {
            employeeDrawer.close();
            queryClient.invalidateQueries({
              queryKey: ['employee', resolvedParams.id],
            });
          }}
          onCancel={employeeDrawer.close}
        />
      )}
    </div>
  );
}

export default function EmployeeDetailPage({
  params,
}: EmployeeDetailPageProps) {
  return (
    <ReactQueryProvider>
      <EmployeeDetailContent params={params} />
    </ReactQueryProvider>
  );
}
