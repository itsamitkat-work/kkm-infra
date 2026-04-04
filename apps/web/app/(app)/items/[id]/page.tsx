'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  useItemById,
  ITEM_BY_ID_QUERY_KEY,
} from '@/hooks/items/use-item-by-id';
import { TableLoadingState } from '@/components/tables/table-loading';
import { ItemNotFoundDialog } from './components/item-not-found-dialog';
import { ItemDetailContent } from './components/item-detail-content';

export default function ItemDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();

  const id = typeof params.id === 'string' ? params.id : '';
  const { data: item, isLoading: isItemLoading } = useItemById(
    id ? id : undefined
  );

  const handleDrawerSubmit = React.useCallback(() => {
    if (id) {
      queryClient.invalidateQueries({ queryKey: [ITEM_BY_ID_QUERY_KEY, id] });
    }
  }, [queryClient, id]);

  if (id && isItemLoading) {
    return (
      <div className='flex h-full w-full items-center justify-center p-8'>
        <TableLoadingState message='Loading item details...' />
      </div>
    );
  }

  if (!id || !item) {
    return <ItemNotFoundDialog />;
  }

  return <ItemDetailContent item={item} onDrawerSubmit={handleDrawerSubmit} />;
}
