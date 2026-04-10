'use client';

import * as React from 'react';
import { IconSettings } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAttendanceConfig } from '../hooks/use-attendance-config';
import { AttendanceTimeConfig } from '../config/attendance-config';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GlobalConfigTab } from './global-config-tab';
import { ProjectOverridesTab } from './projects-config-tab';
import { useAuth } from '@/hooks/auth';

export function AttendanceConfigDialog() {
  const { roles } = useAuth();
  const isAdmin = React.useMemo(() => roles.includes('Admin'), [roles]);

  const { config, updateGlobal, isLoading, isUpdatingGlobal } =
    useAttendanceConfig();
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('global');

  // Local state for global settings editing
  const [localGlobal, setLocalGlobal] =
    React.useState<AttendanceTimeConfig | null>(null);

  // Sync local state when config loads
  React.useEffect(() => {
    if (config) {
      setLocalGlobal(config.global);
    }
  }, [config]);

  // Also sync when dialog opens to ensure fresh data
  React.useEffect(() => {
    if (isOpen && config) {
      setLocalGlobal(config.global);
    }
  }, [isOpen, config]);

  function handleSaveGlobal() {
    if (!localGlobal) return;

    updateGlobal(localGlobal, {
      onSuccess: () => {
        // We don't necessarily close the dialog if they might want to switch tabs
      },
    });
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='h-8 gap-1.5 px-2.5 font-medium transition-all hover:bg-muted/80'
        >
          <IconSettings className='size-3.5' />
          Configure
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] p-0 overflow-hidden gap-0 border-border/40 shadow-2xl flex flex-col'>
        <div className='p-4 sm:p-5 pb-3 shrink-0'>
          <DialogHeader>
            <div className='flex items-center gap-2 mb-1'>
              <div className='p-1.5 rounded-md bg-primary/10 text-primary'>
                <IconSettings className='size-4' />
              </div>
              <DialogTitle className='text-base sm:text-lg'>
                Attendance Configuration
              </DialogTitle>
            </div>
            <DialogDescription className='text-xs'>
              Manage timing, grace periods, and incentive rates.
            </DialogDescription>
          </DialogHeader>
        </div>

        {isLoading || !localGlobal ? (
          <div className='flex items-center justify-center py-20 flex-1'>
            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='flex-1 flex flex-col min-h-0 overflow-hidden'
          >
            <div className='px-4 sm:px-5 shrink-0'>
              <TabsList className='grid w-full grid-cols-2 h-9 sm:h-9 p-1 bg-muted/50 rounded-lg'>
                <TabsTrigger
                  value='global'
                  className='text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm'
                >
                  Global Settings
                </TabsTrigger>
                <TabsTrigger
                  value='projects'
                  className='text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm'
                >
                  Project Overrides
                </TabsTrigger>
              </TabsList>
            </div>

            <div className='flex-1 min-h-0 relative overflow-hidden'>
              <ScrollArea className='absolute inset-0'>
                <div className='px-4 sm:px-5 pb-4 sm:pb-6'>
                  <TabsContent
                    value='global'
                    className='mt-4 sm:mt-5 flex flex-col gap-4 sm:gap-6 outline-none'
                  >
                    <GlobalConfigTab
                      config={localGlobal}
                      onConfigChange={setLocalGlobal}
                    />
                  </TabsContent>

                  <TabsContent
                    value='projects'
                    className='mt-4 sm:mt-5 outline-none'
                  >
                    <ProjectOverridesTab
                      overrides={config?.projectOverrides ?? []}
                      globalDefaults={localGlobal}
                    />
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        )}

        <div className='flex justify-end gap-2 p-3 sm:p-4 border-t bg-muted/10 items-center shrink-0'>
          <Button
            variant='ghost'
            size='sm'
            className='text-xs h-9 sm:h-8 text-muted-foreground px-3 sm:px-2'
            onClick={() => setIsOpen(false)}
          >
            {activeTab === 'global' ? 'Cancel' : 'Close'}
          </Button>
          {activeTab === 'global' && (
            <Button
              size='sm'
              className='h-9 sm:h-8 text-xs px-4 shadow-sm'
              onClick={handleSaveGlobal}
              disabled={isUpdatingGlobal}
            >
              {isUpdatingGlobal ? (
                <div className='flex items-center gap-2'>
                  <div className='size-3 border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin rounded-full' />
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
