import { ScheduleItemsTree } from './schedule-items-tree';

export default function ItemsTreePage() {
  return (
    <div className='flex min-h-[calc(100dvh-var(--header-height)-2rem)] w-full min-w-0 flex-1 flex-col gap-0'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col px-4 pb-4 md:px-6 md:pb-6'>
        <ScheduleItemsTree />
      </div>
    </div>
  );
}
