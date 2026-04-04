'use client';

import * as React from 'react';
import { Designation } from '../hooks/use-designations-query';
import { SubDesignationsTable } from './sub-designations-table';

interface SubDesignationsListProps {
  designation: Designation;
}

export function SubDesignationsList({ designation }: SubDesignationsListProps) {
  return <SubDesignationsTable designation={designation} />;
}
