'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TableLoadingState } from '@/components/tables/table-loading';
import { useAuth } from '@/hooks/auth/use-auth';
import {
  User as UserIcon,
  Mail,
  Phone,
  Briefcase,
  Shield,
  Building2,
  Calendar,
  Clock,
} from 'lucide-react';

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  className?: string;
}

function InfoItem({ icon: Icon, label, children, className }: InfoItemProps) {
  return (
    <div className={`space-y-0.5 ${className || ''}`}>
      <label className='text-xs font-medium text-muted-foreground flex items-center gap-1.5'>
        <Icon className='h-3.5 w-3.5' />
        {label}
      </label>
      <div className='text-sm text-foreground'>{children}</div>
    </div>
  );
}

export default function AccountPage() {
  const { getUser, getUserPermissions } = useAuth();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const user = isClient ? getUser() : null;
  const permissions = isClient
    ? getUserPermissions()
    : { permissions: [], roles: [] };

  if (!isClient) {
    return <TableLoadingState />;
  }

  if (!user) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-center space-y-6'>
          <div className='space-y-2'>
            <h3 className='text-lg font-semibold'>Not Authenticated</h3>
            <p className='text-sm text-muted-foreground max-w-md'>
              Please log in to view your account information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background flex flex-col w-full'>
      <div className='flex-1 overflow-auto bg-muted/20 p-4 sm:p-6'>
        <div className='mx-auto space-y-6'>
          {/* Header with Avatar and Basic Info */}
          <Card>
            <CardContent className='pt-6'>
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-4'>
                  <Avatar className='h-20 w-20'>
                    <AvatarImage src='' alt={user.userName} />
                    <AvatarFallback className='bg-primary/10 text-primary text-xl font-semibold'>
                      {getInitials(user.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className='space-y-1'>
                    <h2 className='text-2xl font-bold text-foreground'>
                      {user.userName}
                    </h2>
                    {user.designation && (
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <Briefcase className='h-4 w-4' />
                        <span className='text-sm font-medium'>
                          {user.designation}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4'>
                <InfoItem icon={UserIcon} label='Username'>
                  {user.userName}
                </InfoItem>
                {user.email && (
                  <InfoItem icon={Mail} label='Email'>
                    {user.email}
                  </InfoItem>
                )}
                {user.phone && (
                  <InfoItem icon={Phone} label='Phone'>
                    {user.phone}
                  </InfoItem>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Employment Information */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Briefcase className='h-5 w-5' />
                Employment
              </CardTitle>
              <CardDescription>
                Your current employment details and work information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4'>
                {user.designation ? (
                  <InfoItem icon={Briefcase} label='Designation'>
                    {user.designation}
                  </InfoItem>
                ) : (
                  <InfoItem icon={Briefcase} label='Designation'>
                    <span className='text-muted-foreground'>Not assigned</span>
                  </InfoItem>
                )}
                <InfoItem icon={Building2} label='Department'>
                  <span className='text-muted-foreground'>Not available</span>
                </InfoItem>
                <InfoItem icon={Calendar} label='Joining Date'>
                  <span className='text-muted-foreground'>Not available</span>
                </InfoItem>
                <InfoItem icon={Clock} label='Employment Type'>
                  <span className='text-muted-foreground'>Not available</span>
                </InfoItem>
              </div>
            </CardContent>
          </Card>

          {/* Permissions from Auth (if available) */}
          {permissions.roles && permissions.roles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Shield className='h-5 w-5' />
                  Role Codes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex flex-wrap gap-2'>
                  {permissions.roles.map((roleCode, index) => (
                    <Badge
                      key={index}
                      variant='outline'
                      className='text-sm py-1.5 px-3'
                    >
                      {roleCode}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
