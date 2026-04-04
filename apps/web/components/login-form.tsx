'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/auth/use-auth';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, isError } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ phone: username, password });
  };

  const isFormValid = username.trim() !== '' && password.trim() !== '';

  return (
    <div className={cn('flex flex-col gap-4 sm:gap-6', className)} {...props}>
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader className='pb-4 sm:pb-6'>
          <CardTitle className='text-lg sm:text-xl'>
            Login to your account
          </CardTitle>
          <CardDescription className='text-sm'>
            Enter your username and password to continue
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-0'>
          <form
            onSubmit={handleSubmit}
            className='flex flex-col gap-4 sm:gap-6'
          >
            {/* Username */}
            <div className='grid gap-2 sm:gap-3'>
              <Label htmlFor='username' className='text-sm'>
                Username
              </Label>
              <Input
                id='username'
                type='text'
                placeholder='Enter your username'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className='grid gap-2 sm:gap-3'>
              <div className='flex items-center'>
                <Label htmlFor='password' className='text-sm'>
                  Password
                </Label>
                <a
                  href='#'
                  className='ml-auto inline-block text-sm underline-offset-4 hover:underline'
                >
                  Forgot password?
                </a>
              </div>
              <div className='relative'>
                <Input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Enter your password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className='pr-10'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword((prev) => !prev)}
                  className='absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground'
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className='h-5 w-5' />
                  ) : (
                    <Eye className='h-5 w-5' />
                  )}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {isError && (
              <p className='text-sm text-red-500'>
                Invalid username or password
              </p>
            )}

            {/* Submit */}
            <div className='flex flex-col gap-3'>
              <Button
                type='submit'
                className='w-full'
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
