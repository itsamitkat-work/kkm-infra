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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CircleX,
  IndianRupeeIcon,
  Info,
  List,
  MoreVertical,
  Receipt,
  Ruler,
} from 'lucide-react';
import { use, useEffect, useState } from 'react';
import { ActionMenuItem } from '@/components/detail-page-header';
import {
  useProjectTabCountsQuery,
  type ProjectTabCounts,
} from '@/hooks/projects/use-project-tab-counts-query';
import { useProject } from '@/app/(app)/projects/hooks/use-project-query';
import { cn } from '@/lib/utils';
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

/** Older links used `?tab=est|msr|blg`; normalize to `ProjectBoqLinesType` tab ids. */
function sheetTabFromUrlParam(tab: string | null): string | null {
  if (!tab) {
    return null;
  }
  switch (tab) {
    case 'est':
      return 'estimation';
    case 'msr':
      return 'measurement';
    case 'blg':
      return 'billing';
    default:
      return tab;
  }
}

const TAB_CONFIG: {
  id: string;
  label: string;
  mobileLabel: string;
  badgeCountKey?: keyof ProjectTabCounts;
}[] = [
  {
    id: 'project-info',
    label: 'Project Info',
    mobileLabel: 'Info',
  },
  {
    id: 'project-items',
    label: 'Planned Items',
    mobileLabel: 'Planned',
    badgeCountKey: 'plannedBoqLines',
  },
  {
    id: 'estimation',
    label: 'Estimation',
    mobileLabel: 'Estimation',
    badgeCountKey: 'estimationLines',
  },
  {
    id: 'measurement',
    label: 'Measurement',
    mobileLabel: 'Measurement',
    badgeCountKey: 'measurementLines',
  },
  {
    id: 'billing',
    label: 'Billing',
    mobileLabel: 'Billing',
    badgeCountKey: 'billingLines',
  },
  {
    id: 'deviation-report',
    label: 'Reports',
    mobileLabel: 'Reports',
  },
];

const ACTION_MENU_ITEMS: ActionMenuItem[] = [];

// Additional actions for dropdown menu
const ADDITIONAL_ACTIONS: ActionMenuItem[] = [
  // {
  //   icon: CircleX,
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

  const {
    data: tabCounts,
    isPending: isTabCountsPending,
    isError: isTabCountsError,
  } = useProjectTabCountsQuery({ projectId: resolvedParams.id });

  // Initialize active tab from URL search params to prevent flashing
  const getInitialTab = () => {
    const tabFromUrl = sheetTabFromUrlParam(searchParams.get('tab'));
    if (tabFromUrl && TAB_CONFIG.some((tab) => tab.id === tabFromUrl)) {
      return tabFromUrl;
    }
    return 'project-info';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (!raw) {
      return;
    }
    const normalized = sheetTabFromUrlParam(raw);
    if (
      normalized &&
      normalized !== raw &&
      TAB_CONFIG.some((tab) => tab.id === normalized)
    ) {
      const next = new URLSearchParams(searchParams.toString());
      next.set('tab', normalized);
      router.replace(`/projects/${resolvedParams.id}?${next.toString()}`, {
        scroll: false,
      });
      setActiveTab(normalized);
    }
  }, [searchParams, router, resolvedParams.id]);

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

  function renderTabContent(tabId: string) {
    switch (tabId) {
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
      case 'estimation':
        return (
          <ItemsTab
            key={`estimation-${tabId}`}
            projectId={resolvedParams.id}
            type='estimation'
          />
        );
      case 'measurement':
        return (
          <ItemsTab
            key={`measurement-${tabId}`}
            projectId={resolvedParams.id}
            type='measurement'
          />
        );

      case 'billing':
        return (
          <ItemsTab
            key={`billing-${tabId}`}
            projectId={resolvedParams.id}
            type='billing'
          />
        );
      case 'deviation-report':
        return <DeviationReportTab projectId={resolvedParams.id} />;
      default:
        return (
          <ProjectInfo
            project={project}
            isLoading={isLoading}
            isError={isError}
          />
        );
    }
  }

  if (isLoading) {
    return <TableLoadingState />;
  }

  if (!project) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-center space-y-6'>
          <div className='relative'>
            <div className='h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center'>
              <CircleX className='h-8 w-8 text-destructive' />
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
        <div className='flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5'>
          <div className='flex min-w-0 items-center gap-2 sm:gap-3'>
            <Button
              variant='ghost'
              onClick={handleBack}
              className='h-8 shrink-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground'
            >
              <ArrowLeft className='size-3.5' />
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
                onClick={action.onClick}
                className='flex items-center gap-2'
              >
                <action.icon className='size-4' />
                {action.label}
              </Button>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost'>
                  <MoreVertical className='size-4' />
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
        <Card className='@container/card m-0 gap-0 rounded-none border-0 py-0 shadow-none'>
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className='gap-0'
          >
            <CardHeader className='gap-0 px-3 pb-0 pt-2 sm:px-4 sm:pt-2.5'>
              <TabsList variant='line' className='w-full justify-start'>
                {TAB_CONFIG.map((tab) => {
                  const countKey = tab.badgeCountKey;
                  const showCountBadge = countKey != null;
                  const badgeValue =
                    tabCounts && countKey != null
                      ? tabCounts[countKey]
                      : undefined;

                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className={cn(
                        'h-8 flex-none shrink-0 px-2 py-0 text-xs sm:px-2.5 sm:text-sm',
                        showCountBadge && 'gap-2'
                      )}
                    >
                      <span className='hidden sm:inline'>{tab.label}</span>
                      <span className='sm:hidden'>{tab.mobileLabel}</span>
                      {showCountBadge &&
                        (isTabCountsPending ? (
                          <Spinner className='size-3 opacity-60' />
                        ) : (
                          <Badge
                            variant='secondary'
                            className='h-5 min-w-5 border-0 bg-primary/10 px-1.5 text-[0.625rem] text-primary'
                          >
                            {isTabCountsError ? '–' : (badgeValue ?? 0)}
                          </Badge>
                        ))}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </CardHeader>
            <CardContent className='px-3 pb-3 pt-1 sm:px-4 sm:pb-4 sm:pt-1.5'>
              {TAB_CONFIG.map((tab) => (
                <TabsContent
                  key={tab.id}
                  value={tab.id}
                  className='m-0 mt-0 outline-none'
                >
                  {renderTabContent(tab.id)}
                </TabsContent>
              ))}
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
