'use client';

import * as React from 'react';
import { CircleAlertIcon, UserIcon, XIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  formatBytes,
  useFileUpload,
  type FileWithPreview,
} from '@/hooks/use-file-upload';
import { cn } from '@/lib/utils';

export interface UserDrawerAvatarProps {
  maxSize?: number;
  className?: string;
  onFileChange?: (file: FileWithPreview | null) => void;
  defaultAvatar?: string | null;
  disabled?: boolean;
}

export function UserDrawerAvatar({
  maxSize = 2 * 1024 * 1024,
  className,
  onFileChange,
  defaultAvatar,
  disabled = false,
}: UserDrawerAvatarProps) {
  const [
    { files, isDragging, errors },
    {
      removeFile,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles: 1,
    maxSize,
    accept: 'image/*',
    multiple: false,
    onFilesChange: (nextFiles) => {
      onFileChange?.(nextFiles[0] ?? null);
    },
  });

  const currentFile = files[0];
  const previewUrl = currentFile?.preview || defaultAvatar || undefined;

  function handleRemoveClick() {
    if (currentFile) {
      removeFile(currentFile.id);
    }
    onFileChange?.(null);
  }

  function handleOpenPicker() {
    if (!disabled) {
      openFileDialog();
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className='relative'>
        <div
          className={cn(
            'group/avatar relative h-24 w-24 overflow-hidden rounded-full border border-dashed transition-colors',
            disabled
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/40',
            previewUrl && 'border-solid',
          )}
          onDragEnter={disabled ? undefined : handleDragEnter}
          onDragLeave={disabled ? undefined : handleDragLeave}
          onDragOver={disabled ? undefined : handleDragOver}
          onDrop={disabled ? undefined : handleDrop}
          onClick={handleOpenPicker}
          onKeyDown={(e) => {
            if (disabled) {
              return;
            }
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openFileDialog();
            }
          }}
          role={disabled ? undefined : 'button'}
          tabIndex={disabled ? undefined : 0}
          aria-label='Upload avatar image'
        >
          <input {...getInputProps()} className='sr-only' disabled={disabled} />

          {previewUrl ? (
            <img
              src={previewUrl}
              alt=''
              className='h-full w-full object-cover'
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center'>
              <UserIcon className='text-muted-foreground size-6' />
            </div>
          )}
        </div>

        {currentFile && !disabled ? (
          <Button
            type='button'
            size='icon'
            variant='outline'
            onClick={handleRemoveClick}
            className='absolute end-0.5 top-0.5 z-10 size-6 rounded-full'
            aria-label='Remove selected avatar'
          >
            <XIcon className='size-3.5' />
          </Button>
        ) : null}
      </div>

      <div className='space-y-0.5 text-center'>
        <p className='text-sm font-medium'>
          {currentFile ? 'Avatar selected' : 'Upload avatar'}
        </p>
        <p className='text-muted-foreground text-xs'>
          PNG, JPG up to {formatBytes(maxSize)}
        </p>
      </div>

      {errors.length > 0 ? (
        <Alert variant='destructive' className='mt-1 w-full max-w-sm'>
          <CircleAlertIcon className='size-4' />
          <AlertTitle>File upload error(s)</AlertTitle>
          <AlertDescription>
            {errors.map((error, index) => (
              <p key={index} className='last:mb-0'>
                {error}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
