'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatIndianNumber } from '@/lib/numberToText';
import { MasterItem } from '@/hooks/items/types';
import { ItemDetailField } from './item-detail-field';

export interface ItemOverviewTabProps {
  item: MasterItem;
}

export function ItemOverviewTab({ item }: ItemOverviewTabProps) {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4'>
      <Card className='md:col-span-2 lg:col-span-2'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>General Information</CardTitle>
          <CardDescription>Core identification details</CardDescription>
        </CardHeader>
        <CardContent className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5'>
          <ItemDetailField
            label='Full Name'
            value={item.name}
            className='sm:col-span-2'
          />
          <ItemDetailField label='Client Name' value={item.clientName} />
          <ItemDetailField label='Nick Name' value={item.nickName} />
          <ItemDetailField label='Item Code' value={item.code} copyable />
          <ItemDetailField label='Nick Code' value={item.dsrCode} />
        </CardContent>
      </Card>

      <Card className='md:col-span-1 lg:col-span-2'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>Classification & Rate</CardTitle>
          <CardDescription>Categorization and pricing</CardDescription>
        </CardHeader>
        <CardContent className='grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5'>
          <ItemDetailField
            label='Rate'
            value={
              item.rate != null ? (
                <Badge
                  variant='secondary'
                  className='text-sm font-semibold px-2'
                >
                  ₹ {formatIndianNumber(item.rate)}
                </Badge>
              ) : null
            }
          />
          <ItemDetailField
            label='Unit'
            value={
              item.unit ? <Badge variant='outline'>{item.unit}</Badge> : null
            }
          />
          <Separator className='sm:col-span-2 my-1' />
          <ItemDetailField label='Head' value={item.head} />
          <ItemDetailField
            label='Sub Head'
            value={item.subhead ?? item.subHead}
          />
          <ItemDetailField label='Schedule Name' value={item.scheduleName} />
          <ItemDetailField label='Schedule Rate' value={item.scheduleRate} />
          <ItemDetailField
            label='Types'
            value={item.types}
            className='sm:col-span-2'
          />
        </CardContent>
      </Card>

      <Card className='md:col-span-3 lg:col-span-4'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>System Identifiers</CardTitle>
          <CardDescription>Hash IDs for system reference</CardDescription>
        </CardHeader>
        <CardContent className='grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5'>
          <ItemDetailField label='System ID' value={item.hashId} copyable />
          <ItemDetailField label='Parent ID' value={item.parentId} copyable />
          <ItemDetailField label='DSR ID' value={item.dsrId} copyable />
        </CardContent>
      </Card>
    </div>
  );
}
