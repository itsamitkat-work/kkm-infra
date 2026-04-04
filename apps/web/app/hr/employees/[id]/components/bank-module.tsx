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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  CreditCard,
  Star,
  Smartphone,
} from 'lucide-react';
import { BankAccount, ACCOUNT_TYPES } from '../types';
import {
  useBankAccounts,
  useAddBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
} from '../hooks/use-employee-detail';
import { TableLoadingState } from '@/components/tables/table-loading';
import { Label } from '@/components/ui/label';

interface BankModuleProps {
  employeeId: string;
  employeeName: string;
}

export function BankModule({ employeeId, employeeName }: BankModuleProps) {
  const { data: bankAccounts, isLoading } = useBankAccounts(employeeId);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] =
    React.useState<BankAccount | null>(null);

  if (isLoading) {
    return <TableLoadingState />;
  }

  const accounts = bankAccounts || [];
  const primaryAccount = accounts.find((a) => a.isPrimary);
  const otherAccounts = accounts.filter((a) => !a.isPrimary);

  function handleAdd() {
    setEditingAccount(null);
    setIsDialogOpen(true);
  }

  function handleEdit(account: BankAccount) {
    setEditingAccount(account);
    setIsDialogOpen(true);
  }

  return (
    <div className='space-y-6'>
      {/* Single Consolidated Bank Accounts Box */}
      <div className='border rounded-lg p-4 sm:p-6 space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Building2 className='h-4 w-4 text-muted-foreground' />
            <h3 className='text-base font-semibold text-foreground'>
              Bank Accounts
            </h3>
            <Badge variant='secondary' className='text-xs'>
              {accounts.length}
            </Badge>
          </div>
          <Button size='sm' onClick={handleAdd}>
            <Plus className='h-4 w-4 mr-1' />
            Add Bank Account
          </Button>
        </div>

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <div className='p-8 text-center text-muted-foreground'>
            <Building2 className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <p>No bank accounts added yet</p>
            <Button variant='outline' className='mt-4' onClick={handleAdd}>
              <Plus className='h-4 w-4 mr-1' />
              Add First Account
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            {/* Primary Account First */}
            {primaryAccount && (
              <BankAccountItem
                account={primaryAccount}
                employeeId={employeeId}
                onEdit={handleEdit}
              />
            )}
            {/* Other Accounts */}
            {otherAccounts.map((account) => (
              <BankAccountItem
                key={account.id}
                account={account}
                employeeId={employeeId}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bank Account Dialog */}
      <BankAccountDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        account={editingAccount}
      />
    </div>
  );
}

interface BankAccountItemProps {
  account: BankAccount;
  employeeId: string;
  onEdit: (account: BankAccount) => void;
}

function BankAccountItem({ account, onEdit }: BankAccountItemProps) {
  const deleteAccountMutation = useDeleteBankAccount();

  function handleDelete() {
    if (confirm('Are you sure you want to delete this bank account?')) {
      deleteAccountMutation.mutate(account.id);
    }
  }

  function maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber;
    return `${'*'.repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}`;
  }

  const accountTypeLabel =
    ACCOUNT_TYPES.find((t) => t.value === account.accountType)?.label ||
    account.accountType;

  return (
    <div
      className={`p-4 rounded-lg border ${
        account.isPrimary ? 'border-primary/50 bg-primary/5' : ''
      }`}
    >
      <div className='flex items-start justify-between mb-3'>
        <div className='flex items-center gap-3'>
          <Building2 className='h-4 w-4 text-muted-foreground' />
          <div>
            <div className='flex items-center gap-2'>
              <p className='text-sm font-semibold'>{account.bankName}</p>
              {account.isPrimary && (
                <Badge variant='default' className='text-xs'>
                  <Star className='h-3 w-3 mr-1' />
                  Primary
                </Badge>
              )}
            </div>
            {account.branchName && (
              <p className='text-xs text-muted-foreground'>
                {account.branchName}
              </p>
            )}
          </div>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={() => onEdit(account)}
            className='text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-muted/50'
            aria-label='Edit'
          >
            <Pencil className='h-4 w-4' />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteAccountMutation.isPending}
            className='text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed'
            aria-label='Delete'
          >
            <Trash2 className='h-4 w-4' />
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2'>
        <div className='space-y-0.5'>
          <label className='text-xs font-medium text-muted-foreground flex items-center gap-1.5'>
            <CreditCard className='h-3.5 w-3.5' />
            Account Number
          </label>
          <p className='text-sm font-mono'>
            {maskAccountNumber(account.accountNumber)}
          </p>
        </div>

        <div className='space-y-0.5'>
          <label className='text-xs font-medium text-muted-foreground'>
            IFSC Code
          </label>
          <p className='text-sm font-mono'>{account.ifscCode}</p>
        </div>

        <div className='space-y-0.5'>
          <label className='text-xs font-medium text-muted-foreground'>
            Account Type
          </label>
          <p className='text-sm'>{accountTypeLabel}</p>
        </div>

        {account.upiId && (
          <div className='space-y-0.5'>
            <label className='text-xs font-medium text-muted-foreground flex items-center gap-1.5'>
              <Smartphone className='h-3.5 w-3.5' />
              UPI ID
            </label>
            <p className='text-sm'>{account.upiId}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface BankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  account: BankAccount | null;
}

function BankAccountDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  account,
}: BankAccountDialogProps) {
  const [formData, setFormData] = React.useState<{
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    branchName: string;
    accountType: 'savings' | 'current' | 'salary';
    isPrimary: boolean;
    upiId: string;
  }>({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    accountType: 'savings',
    isPrimary: false,
    upiId: '',
  });

  const addAccountMutation = useAddBankAccount();
  const updateAccountMutation = useUpdateBankAccount();

  const isEdit = !!account;

  React.useEffect(() => {
    if (account) {
      setFormData({
        accountHolderName: account.accountHolderName,
        accountNumber: account.accountNumber,
        ifscCode: account.ifscCode,
        bankName: account.bankName,
        branchName: account.branchName || '',
        accountType: account.accountType,
        isPrimary: account.isPrimary,
        upiId: account.upiId || '',
      });
    } else {
      setFormData({
        accountHolderName: employeeName,
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        branchName: '',
        accountType: 'savings',
        isPrimary: false,
        upiId: '',
      });
    }
  }, [account, employeeName, open]);

  function handleChange(field: string, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEdit && account) {
      updateAccountMutation.mutate(
        {
          ...account,
          ...formData,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      addAccountMutation.mutate(
        {
          ...formData,
          employeeId,
          isActive: true,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  }

  const isPending =
    addAccountMutation.isPending || updateAccountMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Bank Account' : 'Add Bank Account'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the bank account details below.'
              : 'Add a new bank account for salary disbursement.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-4 max-h-[60vh] overflow-y-auto'>
            <div className='space-y-2'>
              <Label htmlFor='accountHolderName'>Account Holder Name *</Label>
              <Input
                id='accountHolderName'
                value={formData.accountHolderName}
                onChange={(e) =>
                  handleChange('accountHolderName', e.target.value)
                }
                placeholder='Enter account holder name'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='bankName'>Bank Name *</Label>
              <Input
                id='bankName'
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                placeholder='Enter bank name'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='branchName'>Branch Name</Label>
              <Input
                id='branchName'
                value={formData.branchName}
                onChange={(e) => handleChange('branchName', e.target.value)}
                placeholder='Enter branch name'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='accountNumber'>Account Number *</Label>
                <Input
                  id='accountNumber'
                  value={formData.accountNumber}
                  onChange={(e) =>
                    handleChange('accountNumber', e.target.value)
                  }
                  placeholder='Enter account number'
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='ifscCode'>IFSC Code *</Label>
                <Input
                  id='ifscCode'
                  value={formData.ifscCode}
                  onChange={(e) =>
                    handleChange('ifscCode', e.target.value.toUpperCase())
                  }
                  placeholder='e.g., HDFC0001234'
                  required
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='accountType'>Account Type *</Label>
              <Select
                value={formData.accountType}
                onValueChange={(value) => handleChange('accountType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select account type' />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='upiId'>UPI ID (Optional)</Label>
              <Input
                id='upiId'
                value={formData.upiId}
                onChange={(e) => handleChange('upiId', e.target.value)}
                placeholder='e.g., name@bank'
              />
            </div>

            <div className='flex items-center justify-between rounded-lg border p-3'>
              <div className='space-y-0.5'>
                <Label htmlFor='isPrimary'>Primary Account</Label>
                <p className='text-xs text-muted-foreground'>
                  Salary will be credited to this account
                </p>
              </div>
              <Switch
                id='isPrimary'
                checked={formData.isPrimary}
                onCheckedChange={(checked) =>
                  handleChange('isPrimary', checked)
                }
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
              {isPending ? 'Saving...' : isEdit ? 'Update' : 'Add Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
