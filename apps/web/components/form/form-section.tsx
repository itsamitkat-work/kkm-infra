'use client';

import * as React from 'react';

/**
 * A reusable FormSection component that provides consistent section layout
 * with title, content, and optional separator.
 *
 * This component provides:
 * - Consistent section title styling
 * - Proper spacing between sections
 * - Optional separator between sections
 * - Flexible content area for form fields
 *
 * @example
 * ```tsx
 * <FormSection title="Basic Information">
 *   <FormInputField ... />
 *   <FormSelectField ... />
 * </FormSection>
 *
 * <FormSection title="Location Details" showSeparator>
 *   <FormInputField ... />
 * </FormSection>
 * ```
 */

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  showSeparator?: boolean;
  className?: string;
  titleClassName?: string;
}

export const FormSection = React.memo<FormSectionProps>(
  ({
    title,
    children,
    showSeparator = true,
    className = '',
    titleClassName = '',
  }) => {
    return (
      <div
        className={`space-y-4 ${
          showSeparator ? 'pt-6 border-t border-border/50' : ''
        } ${className}`}
      >
        <div className='flex items-center gap-2'>
          <h3
            className={`text-lg font-semibold text-foreground ${titleClassName}`}
          >
            {title}
          </h3>
        </div>

        <div className='space-y-4'>{children}</div>
      </div>
    );
  }
);

FormSection.displayName = 'FormSection';
