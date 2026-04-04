import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MaterialFactorForFactor } from '../hooks/use-factors-query';

type FactorMaterialsTableProps = {
  materials: MaterialFactorForFactor[];
};

export function FactorMaterialsTable({ materials }: FactorMaterialsTableProps) {
  if (!materials.length) {
    return (
      <div className='p-4 text-sm text-muted-foreground'>
        No materials linked to this factor.
      </div>
    );
  }

  return (
    <div className='p-3'>
      <Table className='w-full text-xs sm:text-sm'>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[200px]'>Material Type</TableHead>
            <TableHead>Factor Value</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((material) => (
            <TableRow key={material.factorHashId}>
              <TableCell>{material.materialTypeName}</TableCell>
              <TableCell>{material.factorValue}</TableCell>
              <TableCell>{material.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

