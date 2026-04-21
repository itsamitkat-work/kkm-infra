'use client';

import * as React from 'react';
import {
  FieldSet,
  FieldGroup,
  FieldLegend,
  FieldDescription,
  FieldSeparator,
  FieldTitle,
} from '@/components/ui/field';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  showSeparator?: boolean;
  className?: string;
  titleClassName?: string;
}

export const FormSection = React.memo<FormSectionProps>(
  ({
    title,
    description,
    children,
    showSeparator = true,
    className,
    titleClassName,
  }) => {
    return (
      <FieldSet className={className}>
        {showSeparator && <FieldSeparator />}
        <FieldTitle className={titleClassName}>{title}</FieldTitle>
        {description && <FieldDescription>{description}</FieldDescription>}
        <FieldGroup>{children}</FieldGroup>
      </FieldSet>
    );
  }
);

FormSection.displayName = 'FormSection';
