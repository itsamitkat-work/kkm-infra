'use client';

import * as React from 'react';
import {
  AtSign,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Mail,
  Phone,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { TableLoadingState } from '@/components/tables/table-loading';
import { UserDrawerAvatar } from '../administration/users/components/user-drawer-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/auth';
import type { FileWithPreview } from '@/hooks/use-file-upload';
import { resolveProfileAvatarSrc } from '@/lib/profile-avatar';

import { useMyProfileQuery } from '@/hooks/use-my-profile-query';
import { useUpdateMyProfileAvatarMutation } from './hooks/use-update-my-profile-avatar-mutation';

function formatDisplayLabel(
  profileName: string | null | undefined,
  fallback: string
): string {
  const trimmed = profileName?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return fallback;
}

function AccountReadOnlyItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Item variant='muted' size='sm'>
      <ItemMedia variant='icon'>
        <Icon className='text-muted-foreground size-4' aria-hidden />
      </ItemMedia>
      <ItemContent className='min-w-0 gap-0'>
        <ItemTitle className='text-muted-foreground text-xs font-normal'>
          {label}
        </ItemTitle>
        <ItemDescription className='text-foreground text-sm font-medium'>
          {value}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}

export default function AccountPage() {
  const { user, roles, isLoading: isAuthLoading } = useAuth();
  const profileQuery = useMyProfileQuery(!isAuthLoading && Boolean(user));
  const updateAvatarMutation = useUpdateMyProfileAvatarMutation();

  const [pendingAvatarFile, setPendingAvatarFile] = React.useState<File | null>(
    null
  );
  const [removePhotoDialogOpen, setRemovePhotoDialogOpen] =
    React.useState(false);

  const profile = profileQuery.data;
  const displayName = formatDisplayLabel(
    profile?.display_name,
    user?.userName ?? '—'
  );
  const profileUsername =
    profile?.username?.trim() || user?.userName?.trim() || '—';
  const avatarPreviewSource = resolveProfileAvatarSrc(
    profile?.avatar_url ?? user?.avatarUrl ?? null
  );

  function handleAvatarFileChange(file: FileWithPreview | null) {
    if (!file || !(file.file instanceof File)) {
      setPendingAvatarFile(null);
      return;
    }
    setPendingAvatarFile(file.file);
  }

  async function handleSaveAvatar() {
    if (!pendingAvatarFile) {
      return;
    }
    try {
      await updateAvatarMutation.mutateAsync(pendingAvatarFile);
      setPendingAvatarFile(null);
    } catch {
      // Toast handled in mutation hook.
    }
  }

  function handleOpenRemovePhotoDialog() {
    setRemovePhotoDialogOpen(true);
  }

  async function handleConfirmRemoveAvatar() {
    try {
      await updateAvatarMutation.mutateAsync(null);
      setPendingAvatarFile(null);
      setRemovePhotoDialogOpen(false);
    } catch {
      // Toast handled in mutation hook.
    }
  }

  const showPageLoading =
    isAuthLoading || (Boolean(user) && profileQuery.isPending);

  if (showPageLoading) {
    return <TableLoadingState message='Loading account…' />;
  }

  if (!user) {
    return (
      <div className='bg-background flex min-h-screen w-full items-center justify-center p-6'>
        <Item variant='outline' size='default' className='max-w-md'>
          <ItemContent>
            <ItemTitle>Not signed in</ItemTitle>
            <ItemDescription>
              Sign in to view your account and update your profile photo.
            </ItemDescription>
          </ItemContent>
        </Item>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className='bg-background flex min-h-screen w-full items-center justify-center p-6'>
        <Item variant='outline' size='default' className='max-w-md'>
          <ItemContent>
            <ItemTitle>Could not load profile</ItemTitle>
            <ItemDescription>
              {profileQuery.error?.message ?? 'Try refreshing the page.'}
            </ItemDescription>
          </ItemContent>
        </Item>
      </div>
    );
  }

  const hasStoredAvatar = Boolean(profile?.avatar_url?.trim());

  return (
    <div className='bg-background flex min-h-screen w-full flex-col'>
      <div className='bg-muted/20 flex-1 overflow-auto p-4 sm:p-6'>
        <div className='mx-auto flex max-w-3xl flex-col gap-6'>
          <Card>
            <CardHeader>
              <CardTitle>Your profile</CardTitle>
              <CardDescription>
                You can change your profile photo. Contact an administrator to
                update other fields.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <Item variant='outline' size='default' className='items-start'>
                <div className='flex flex-col items-center gap-3 sm:items-start'>
                  <UserDrawerAvatar
                    key={`avatar-${user.hashId ?? 'me'}-${profile?.updated_at ?? '0'}`}
                    defaultAvatar={avatarPreviewSource}
                    onFileChange={handleAvatarFileChange}
                  />
                  <div className='flex flex-wrap items-center justify-center gap-2 sm:justify-start'>
                    {pendingAvatarFile ? (
                      <Button
                        type='button'
                        className='gap-2'
                        disabled={updateAvatarMutation.isPending}
                        onClick={handleSaveAvatar}
                      >
                        {updateAvatarMutation.isPending ? (
                          <Spinner className='size-4' />
                        ) : null}
                        Save photo
                      </Button>
                    ) : null}
                    {hasStoredAvatar ? (
                      <Button
                        type='button'
                        variant='outline'
                        disabled={updateAvatarMutation.isPending}
                        onClick={handleOpenRemovePhotoDialog}
                      >
                        Remove photo
                      </Button>
                    ) : null}
                  </div>
                </div>
                <ItemContent className='min-w-0 flex-1 gap-1'>
                  <ItemTitle className='text-lg'>{displayName}</ItemTitle>
                  <ItemDescription className='text-sm'>
                    @{profileUsername}
                  </ItemDescription>
                  {user.email ? (
                    <ItemDescription className='pt-1 text-xs'>
                      {user.email}
                    </ItemDescription>
                  ) : null}
                </ItemContent>
              </Item>

              <div>
                <h3 className='text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase'>
                  Details
                </h3>
                <ItemGroup className='gap-2'>
                  <AccountReadOnlyItem
                    icon={UserIcon}
                    label='Display name'
                    value={displayName}
                  />
                  <AccountReadOnlyItem
                    icon={AtSign}
                    label='Username'
                    value={profileUsername}
                  />
                  <AccountReadOnlyItem
                    icon={Mail}
                    label='Email'
                    value={user.email?.trim() ? user.email : '—'}
                  />
                  <AccountReadOnlyItem
                    icon={Phone}
                    label='Phone'
                    value={user.phone?.trim() ? user.phone : '—'}
                  />
                </ItemGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Briefcase className='size-5' aria-hidden />
                Employment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ItemGroup className='gap-2'>
                <AccountReadOnlyItem
                  icon={Briefcase}
                  label='Designation'
                  value={
                    user.designation?.trim() ? (
                      user.designation
                    ) : (
                      <span className='text-muted-foreground font-normal'>
                        Not assigned
                      </span>
                    )
                  }
                />
                <AccountReadOnlyItem
                  icon={Building2}
                  label='Department'
                  value={
                    <span className='text-muted-foreground font-normal'>
                      Not available
                    </span>
                  }
                />
                <AccountReadOnlyItem
                  icon={Calendar}
                  label='Joining date'
                  value={
                    <span className='text-muted-foreground font-normal'>
                      Not available
                    </span>
                  }
                />
                <AccountReadOnlyItem
                  icon={Clock}
                  label='Employment type'
                  value={
                    <span className='text-muted-foreground font-normal'>
                      Not available
                    </span>
                  }
                />
              </ItemGroup>
            </CardContent>
          </Card>

          {roles.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Shield className='size-5' aria-hidden />
                  Role codes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Item variant='muted' size='sm' className='border-0 p-0'>
                  <ItemContent>
                    <div className='flex flex-wrap gap-2'>
                      {roles.map((roleCode) => (
                        <Badge key={roleCode} variant='outline'>
                          {roleCode}
                        </Badge>
                      ))}
                    </div>
                  </ItemContent>
                </Item>
              </CardContent>
            </Card>
          ) : null}

          <AlertDialog
            open={removePhotoDialogOpen}
            onOpenChange={setRemovePhotoDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your saved profile image will be cleared. You can upload a new
                  photo anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={updateAvatarMutation.isPending}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  type='button'
                  variant='destructive'
                  className='gap-2'
                  disabled={updateAvatarMutation.isPending}
                  onClick={handleConfirmRemoveAvatar}
                >
                  {updateAvatarMutation.isPending ? (
                    <Spinner className='size-4' />
                  ) : null}
                  Remove photo
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
