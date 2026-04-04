import { Row, Table } from '@tanstack/react-table';

export const BulkActionBar = <T extends object>({
  table,
  bulkActions,
}: {
  table: Table<T>;
  bulkActions?: (selectedRows: Row<T>[]) => React.ReactNode;
}) => {
  if (table.getFilteredSelectedRowModel().rows.length === 0 || !bulkActions) {
    return null;
  }

  return (
    <div className='border-t bg-muted/50 px-3 py-2 lg:px-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium text-muted-foreground'>
            {table.getFilteredSelectedRowModel().rows.length} row(s) selected
          </span>
        </div>
        <div className='flex items-center gap-2'>
          {bulkActions(table.getFilteredSelectedRowModel().rows)}
        </div>
      </div>
    </div>
  );
};
