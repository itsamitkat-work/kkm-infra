'use client';

import React from 'react';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MasterItem } from '@/hooks/items/types';
import ItemJustificationTable from './ItemJustification-table';
import { ItemDrawer } from '@/app/(app)/items/components/item-drawer';
import { ItemOverviewTab } from './item-overview-tab';
import { useJustificationDefaultValues } from '../hooks/use-justification-default-values';

const tabParser = parseAsStringLiteral(['detail', 'justification']).withDefault(
  'detail'
);

export interface ItemDetailContentProps {
  /** Always defined; page guarantees item is loaded before rendering this. */
  item: MasterItem;
  onDrawerSubmit: () => void;
}

export function ItemDetailContent({
  item,
  onDrawerSubmit,
}: ItemDetailContentProps) {
  const [tab, setTab] = useQueryState('tab', tabParser);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { data: defaultChargeOptions = [] } = useJustificationDefaultValues();

  const handleEditClick = () => setDrawerOpen(true);

  const handleDrawerSubmit = () => {
    setDrawerOpen(false);
    onDrawerSubmit();
  };

  const handleDrawerCancel = () => setDrawerOpen(false);

  return (
    <div className='flex h-full w-full flex-col overflow-hidden'>
      <main className='flex-1 overflow-hidden p-4 md:p-6'>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'detail' | 'justification')}
          className='flex h-full flex-col'
        >
          <div className='mb-4 flex items-center justify-between gap-2'>
            <TabsList className='grid w-[300px] grid-cols-2'>
              <TabsTrigger value='detail'>Overview</TabsTrigger>
              <TabsTrigger value='justification'>Justification</TabsTrigger>
            </TabsList>
            <Button size='sm' variant='outline' onClick={handleEditClick}>
              Edit Item
            </Button>
          </div>

          <TabsContent
            value='detail'
            className='flex-1 overflow-auto mt-0 space-y-4'
          >
            <ItemOverviewTab item={item} />
          </TabsContent>

          <TabsContent
            value='justification'
            className='flex-1 overflow-hidden mt-0'
          >
            <ItemJustificationTable
              item={item}
              defaultChargeOptions={defaultChargeOptions}
            />
          </TabsContent>
        </Tabs>
      </main>

      {drawerOpen && (
        <ItemDrawer
          mode='edit'
          item={item}
          open={drawerOpen}
          onSubmit={handleDrawerSubmit}
          onCancel={handleDrawerCancel}
        />
      )}
    </div>
  );
}
