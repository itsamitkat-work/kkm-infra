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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  IconCircleX,
  IconInfoCircle,
  IconList,
  IconChartBar,
  IconRuler,
  IconAlertTriangle,
  IconReceipt,
  IconDotsVertical,
  IconArrowLeft,
} from '@tabler/icons-react';
import { use, useState } from 'react';
import { ActionMenuItem } from '@/components/detail-page-header';
import { useProject } from '@/hooks/projects/use-project';
import { TableLoadingState } from '@/components/tables/table-loading';
import { ProjectItems } from './items/project-items-table';
import { ItemsTab } from './estimation/Items-tab';
import { ProjectInfo } from './info/project-info';
import { DeviationReportTab } from './deviation/deviation-report-tab';

interface ProjectDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Tab configuration
const TAB_CONFIG = [
  {
    id: 'project-info',
    label: 'Project Info',
    mobileLabel: 'Info',
    icon: IconInfoCircle,
  },
  {
    id: 'project-items',
    label: 'Project Items',
    mobileLabel: 'Items',
    icon: IconList,
  },
  {
    id: 'est',
    label: 'Estimation Report',
    mobileLabel: 'Reports',
    icon: IconChartBar,
  },
  {
    id: 'msr',
    label: 'Measurement Report',
    mobileLabel: 'Measure',
    icon: IconRuler,
  },
  {
    id: 'deviation-report',
    label: 'Deviation Report',
    mobileLabel: 'Deviation',
    icon: IconAlertTriangle,
  },
  {
    id: 'blg',
    label: 'Billing',
    mobileLabel: 'Billing',
    icon: IconReceipt,
  },
];

const ACTION_MENU_ITEMS: ActionMenuItem[] = [];

// Additional actions for dropdown menu
const ADDITIONAL_ACTIONS: ActionMenuItem[] = [
  // {
  //   icon: IconCircleX,
  //   label: "Archive Project",
  //   variant: "destructive",
  //   onClick: () => {
  //     // TODO: Implement archive project functionality
  //     console.log("Archive project clicked");
  //   },
  // },
];

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);

  const { project, isLoading, isError } = useProject(resolvedParams.id);

  // Initialize active tab from URL search params to prevent flashing
  const getInitialTab = () => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && TAB_CONFIG.some((tab) => tab.id === tabFromUrl)) {
      return tabFromUrl;
    }
    return 'project-info';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  const handleBack = () => {
    router.back();
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL search params to persist tab on refresh
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('tab', value);
    router.push(
      `/projects/${resolvedParams.id}?${newSearchParams.toString()}`,
      { scroll: false }
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'project-info':
        return (
          <ProjectInfo
            project={project}
            isLoading={isLoading}
            isError={isError}
          />
        );
      case 'project-items':
        return (
          <ProjectItems key='project-items' projectId={resolvedParams.id} />
        );
      case 'est':
        return (
          <ItemsTab
            key={`estimation-${activeTab}`}
            projectId={resolvedParams.id}
            type='EST'
          />
        );
      case 'msr':
        return (
          <ItemsTab
            key={`measurement-${activeTab}`}
            projectId={resolvedParams.id}
            type='MSR'
          />
        );
      case 'deviation-report':
        return <DeviationReportTab projectId={resolvedParams.id} />;
      case 'blg':
        return (
          <ItemsTab
            key={`billing-${activeTab}`}
            projectId={resolvedParams.id}
            type='BLG'
          />
        );
      default:
        return (
          <ProjectInfo
            project={project}
            isLoading={isLoading}
            isError={isError}
          />
        );
    }
  };

  if (isLoading) {
    return <TableLoadingState />;
  }

  if (!project) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-center space-y-6'>
          <div className='relative'>
            <div className='h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center'>
              <IconCircleX className='h-8 w-8 text-destructive' />
            </div>
          </div>
          <div className='space-y-2'>
            <h3 className='text-lg font-semibold'>Project Not Found</h3>
            <p className='text-sm text-muted-foreground max-w-md'>
              The project you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have permission to view it.
            </p>
          </div>
          <Button onClick={handleBack} variant='outline' className='mt-4'>
            Go Back
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
                  <BreadcrumbLink href='/projects'>Projects</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/projects/${project.id}`}>
                    {project.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {TAB_CONFIG.find((tab) => tab.id === activeTab)?.label ||
                      'Project Details'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Action Menu */}
          <div className='flex items-center gap-2'>
            {ACTION_MENU_ITEMS.map((action, index) => (
              <Button
                key={index}
                variant='ghost'
                size='sm'
                onClick={action.onClick}
                className='flex items-center gap-2'
              >
                <action.icon className='size-4' />
                {action.label}
              </Button>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='sm'>
                  <IconDotsVertical className='size-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                {ADDITIONAL_ACTIONS.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.onClick}
                    className={
                      action.variant === 'destructive' ? 'text-destructive' : ''
                    }
                  >
                    <action.icon className='size-4 mr-2' />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className='flex-1 overflow-auto bg-muted/20 p-0'>
        <Card className='@container/card border-0 rounded-none m-0 gap-0'>
          <CardHeader>
            {/* <CardTitle>{project.name}</CardTitle> */}
            {/* <CardDescription>
              <span className="hidden @[540px]/card:block">
                Project management and reporting
              </span>
              <span className="@[540px]/card:hidden">Project details</span>
            </CardDescription> */}
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
    </div>
  );
}
