'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatIndianNumber } from '@/lib/numberToText';
import { SalaryComponent, ALLOWANCE_TYPES, DEDUCTION_TYPES } from '../types';
import {
  useSalaryStructure,
  useUpdateBasicSalary,
  useAddSalaryComponent,
  useUpdateSalaryComponent,
  useDeleteSalaryComponent,
  calculateSalarySummary,
} from '../hooks/use-employee-detail';
import { TableLoadingState } from '@/components/tables/table-loading';
import { Label } from '@/components/ui/label';

interface SalaryModuleProps {
  employeeId: string;
}

export function SalaryModule({ employeeId }: SalaryModuleProps) {
  const { data: salaryStructure, isLoading } = useSalaryStructure(employeeId);
  const [isBasicDialogOpen, setIsBasicDialogOpen] = React.useState(false);
  const [isComponentDialogOpen, setIsComponentDialogOpen] =
    React.useState(false);
  const [editingComponent, setEditingComponent] =
    React.useState<SalaryComponent | null>(null);
  const [componentType, setComponentType] = React.useState<
    'allowance' | 'deduction'
  >('allowance');
  const [showNumbers, setShowNumbers] = React.useState(false);

  const summary = calculateSalarySummary(salaryStructure || null);

  if (isLoading) {
    return <TableLoadingState />;
  }

  const allowances =
    salaryStructure?.components.filter(
      (c) => c.type === 'allowance' && c.isActive
    ) || [];

  const deductions =
    salaryStructure?.components.filter(
      (c) => c.type === 'deduction' && c.isActive
    ) || [];

  function handleAddComponent(type: 'allowance' | 'deduction') {
    setComponentType(type);
    setEditingComponent(null);
    setIsComponentDialogOpen(true);
  }

  function handleEditComponent(component: SalaryComponent) {
    setComponentType(component.type);
    setEditingComponent(component);
    setIsComponentDialogOpen(true);
  }

  function maskNumber(value: number): string {
    if (showNumbers) {
      return `₹${formatIndianNumber(value)}`;
    }
    return '₹••••••';
  }

  return (
    <div className='space-y-6'>
      {/* Single Consolidated Salary Box */}
      <div className='border rounded-lg p-4 sm:p-6 space-y-6'>
        {/* Header with Toggle */}
        <div className='flex items-center justify-between'>
          <h3 className='text-base font-semibold text-foreground'>
            Salary Summary
          </h3>
          <button
            onClick={() => setShowNumbers(!showNumbers)}
            className='flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50'
            aria-label={showNumbers ? 'Hide numbers' : 'Show numbers'}
          >
            {showNumbers ? (
              <>
                <EyeOff className='h-4 w-4' />
                <span>Hide</span>
              </>
            ) : (
              <>
                <Eye className='h-4 w-4' />
                <span>Show</span>
              </>
            )}
          </button>
        </div>

        {/* Salary Summary */}
        <div className='space-y-3'>
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3'>
            <SummaryItem
              title='Basic Salary'
              value={summary.basicSalary}
              icon={Wallet}
              showNumbers={showNumbers}
              onEdit={() => setIsBasicDialogOpen(true)}
            />
            <SummaryItem
              title='Total Allowances'
              value={summary.totalAllowances}
              icon={TrendingUp}
              showNumbers={showNumbers}
            />
            <SummaryItem
              title='Gross Salary'
              value={summary.grossSalary}
              icon={DollarSign}
              showNumbers={showNumbers}
            />
            <SummaryItem
              title='Total Deductions'
              value={summary.totalDeductions}
              icon={TrendingDown}
              showNumbers={showNumbers}
            />
            <SummaryItem
              title='Net Salary'
              value={summary.netSalary}
              icon={Wallet}
              showNumbers={showNumbers}
            />
          </div>
        </div>

        {/* Allowances and Deductions Section */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Allowances Section */}
          <div className='space-y-3 lg:pr-6 lg:border-r'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <TrendingUp className='h-4 w-4 text-green-600' />
                <h3 className='text-base font-semibold text-foreground'>
                  Allowances
                </h3>
                <Badge variant='secondary' className='text-xs'>
                  {allowances.length}
                </Badge>
              </div>
              <Button size='sm' onClick={() => handleAddComponent('allowance')}>
                <Plus className='h-4 w-4 mr-1' />
                Add Allowance
              </Button>
            </div>
            <ComponentTable
              components={allowances}
              employeeId={employeeId}
              onEdit={handleEditComponent}
              showNumbers={showNumbers}
            />
          </div>

          {/* Deductions Section */}
          <div className='space-y-3 lg:pl-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <TrendingDown className='h-4 w-4 text-red-600' />
                <h3 className='text-base font-semibold text-foreground'>
                  Deductions
                </h3>
                <Badge variant='secondary' className='text-xs'>
                  {deductions.length}
                </Badge>
              </div>
              <Button size='sm' onClick={() => handleAddComponent('deduction')}>
                <Plus className='h-4 w-4 mr-1' />
                Add Deduction
              </Button>
            </div>
            <ComponentTable
              components={deductions}
              employeeId={employeeId}
              onEdit={handleEditComponent}
              showNumbers={showNumbers}
            />
          </div>
        </div>

        {/* Summary Row */}
        <div className='pt-4 border-t'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3'>
            <div className='space-y-0.5'>
              <label className='text-xs font-medium text-muted-foreground'>
                Total Allowances (Monthly)
              </label>
              <p className='text-sm font-medium text-green-600'>
                {maskNumber(summary.totalAllowances)}
              </p>
            </div>
            <div className='space-y-0.5'>
              <label className='text-xs font-medium text-muted-foreground'>
                Total Deductions (Monthly)
              </label>
              <p className='text-sm font-medium text-red-600'>
                {maskNumber(summary.totalDeductions)}
              </p>
            </div>
            <div className='space-y-0.5'>
              <label className='text-xs font-medium text-muted-foreground'>
                Gross Salary (Monthly)
              </label>
              <p className='text-sm font-medium text-foreground'>
                {maskNumber(summary.grossSalary)}
              </p>
            </div>
            <div className='space-y-0.5'>
              <label className='text-xs font-medium text-muted-foreground'>
                Net Salary (Monthly)
              </label>
              <p className='text-sm font-semibold text-foreground'>
                {maskNumber(summary.netSalary)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Salary Dialog */}
      <BasicSalaryDialog
        open={isBasicDialogOpen}
        onOpenChange={setIsBasicDialogOpen}
        employeeId={employeeId}
        currentBasicSalary={salaryStructure?.basicSalary || 0}
      />

      {/* Component Dialog */}
      <ComponentDialog
        open={isComponentDialogOpen}
        onOpenChange={setIsComponentDialogOpen}
        employeeId={employeeId}
        type={componentType}
        component={editingComponent}
      />
    </div>
  );
}

interface SummaryItemProps {
  title: string;
  value: number;
  icon: React.ElementType;
  showNumbers: boolean;
  onEdit?: () => void;
}

function SummaryItem({
  title,
  value,
  icon: Icon,
  showNumbers,
  onEdit,
}: SummaryItemProps) {
  const displayValue = showNumbers
    ? `₹${formatIndianNumber(value)}`
    : '₹••••••';

  return (
    <div className='space-y-0.5'>
      <div className='flex items-center justify-between'>
        <label className='text-xs font-medium text-muted-foreground flex items-center gap-1.5'>
          <Icon className='h-3.5 w-3.5' />
          {title}
        </label>
        {onEdit && (
          <button
            onClick={onEdit}
            className='text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted/50'
            aria-label='Edit'
          >
            <Pencil className='h-3.5 w-3.5' />
          </button>
        )}
      </div>
      <div className='text-sm font-medium text-foreground'>{displayValue}</div>
    </div>
  );
}

interface ComponentTableProps {
  components: SalaryComponent[];
  employeeId: string;
  onEdit: (component: SalaryComponent) => void;
  showNumbers: boolean;
}

function ComponentTable({
  components,
  employeeId,
  onEdit,
  showNumbers,
}: ComponentTableProps) {
  const deleteComponentMutation = useDeleteSalaryComponent();

  function handleDelete(componentId: string) {
    if (confirm('Are you sure you want to delete this component?')) {
      deleteComponentMutation.mutate({ employeeId, componentId });
    }
  }

  if (components.length === 0) {
    return (
      <div className='p-8 text-center text-muted-foreground'>
        No components added yet
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Component Name</TableHead>
          <TableHead className='text-right'>Amount</TableHead>
          <TableHead className='text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {components.map((component) => (
          <TableRow key={component.id}>
            <TableCell className='font-medium'>{component.name}</TableCell>
            <TableCell className='text-right'>
              {showNumbers
                ? `₹${formatIndianNumber(component.amount)}`
                : '₹••••••'}
              {component.isPercentage && showNumbers && (
                <span className='text-xs text-muted-foreground ml-1'>
                  (% of {component.percentageOf})
                </span>
              )}
            </TableCell>
            <TableCell className='text-right'>
              <div className='flex justify-end gap-2'>
                <button
                  onClick={() => onEdit(component)}
                  className='text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-muted/50'
                  aria-label='Edit'
                >
                  <Pencil className='h-4 w-4' />
                </button>
                <button
                  onClick={() => handleDelete(component.id)}
                  disabled={deleteComponentMutation.isPending}
                  className='text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed'
                  aria-label='Delete'
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface BasicSalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  currentBasicSalary: number;
}

function BasicSalaryDialog({
  open,
  onOpenChange,
  employeeId,
  currentBasicSalary,
}: BasicSalaryDialogProps) {
  const [basicSalary, setBasicSalary] = React.useState(
    currentBasicSalary.toString()
  );
  const updateBasicSalaryMutation = useUpdateBasicSalary();

  React.useEffect(() => {
    setBasicSalary(currentBasicSalary.toString());
  }, [currentBasicSalary]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateBasicSalaryMutation.mutate(
      { employeeId, basicSalary: Number(basicSalary) },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Basic Salary</DialogTitle>
          <DialogDescription>
            Enter the new basic salary amount for this employee.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='basicSalary'>Basic Salary (₹)</Label>
              <Input
                id='basicSalary'
                type='number'
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                placeholder='Enter basic salary'
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={updateBasicSalaryMutation.isPending}
            >
              {updateBasicSalaryMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ComponentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  type: 'allowance' | 'deduction';
  component: SalaryComponent | null;
}

function ComponentDialog({
  open,
  onOpenChange,
  employeeId,
  type,
  component,
}: ComponentDialogProps) {
  const [name, setName] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [selectedType, setSelectedType] = React.useState('');

  const addComponentMutation = useAddSalaryComponent();
  const updateComponentMutation = useUpdateSalaryComponent();

  const options = type === 'allowance' ? ALLOWANCE_TYPES : DEDUCTION_TYPES;
  const isEdit = !!component;

  React.useEffect(() => {
    if (component) {
      setName(component.name);
      setAmount(component.amount.toString());
      setSelectedType('');
    } else {
      setName('');
      setAmount('');
      setSelectedType('');
    }
  }, [component, open]);

  function handleTypeChange(value: string) {
    setSelectedType(value);
    const option = options.find((o) => o.value === value);
    if (option) {
      setName(option.label);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const componentData = {
      type,
      name,
      amount: Number(amount),
      isPercentage: false,
      effectiveFrom: new Date().toISOString().split('T')[0],
      isActive: true,
    };

    if (isEdit && component) {
      updateComponentMutation.mutate(
        { employeeId, component: { ...component, ...componentData } },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      addComponentMutation.mutate(
        { employeeId, component: componentData },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  }

  const isPending =
    addComponentMutation.isPending || updateComponentMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit' : 'Add'}{' '}
            {type === 'allowance' ? 'Allowance' : 'Deduction'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update the ${type} details below.`
              : `Add a new ${type} component to the salary structure.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-4'>
            {!isEdit && (
              <div className='space-y-2'>
                <Label htmlFor='componentType'>Type</Label>
                <Select value={selectedType} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${type} type`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className='space-y-2'>
              <Label htmlFor='name'>Name</Label>
              <Input
                id='name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Component name'
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='amount'>Amount (₹)</Label>
              <Input
                id='amount'
                type='number'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder='Enter amount'
                min={0}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
