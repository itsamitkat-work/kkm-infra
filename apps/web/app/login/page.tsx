import { LoginForm } from '@/components/login-form';
import { SplitScreenLayout } from '@/components/layouts/split-screen-layout';
import { Asterisk, Zap, Clock, TrendingUp, Shield } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const heroContent = <HeroSection />;

  const formContent = (
    <div className='w-full max-w-md sm:max-w-lg'>
      <LoginForm />
    </div>
  );

  return (
    <div className='relative min-h-svh w-full'>
      <div className='absolute top-4 right-4 sm:top-6 sm:right-6 z-50'>
        <ThemeToggle />
      </div>
      <SplitScreenLayout leftContent={heroContent} rightContent={formContent} />
    </div>
  );
}

function HeroSection() {
  return (
    <div className='relative w-full h-full min-h-[280px] md:min-h-svh'>
      <picture>
        <source srcSet='/login-hero.webp' type='image/webp' />
        <Image
          src='/login-hero.png'
          alt='Login illustration'
          fill
          className='object-cover dark:brightness-50 dark:contrast-125 transition-all duration-300'
          priority
        />
      </picture>
      <div className='absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 dark:from-black/60 dark:via-black/40 dark:to-black/70 transition-all duration-300 z-10' />
      <div className='absolute inset-0 flex flex-col justify-center sm:justify-start items-start p-4 sm:p-6 md:p-12 text-white z-20 sm:pt-20 md:pt-24'>
        <div className='text-6xl font-bold mb-6 sm:mb-8'>
          <Asterisk className='w-20 h-20 sm:w-24 sm:h-24 drop-shadow-lg dark:drop-shadow-2xl transition-all duration-300' />
        </div>
        <h1 className='text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 md:mb-5 flex items-center gap-2 tracking-tight leading-tight drop-shadow-md dark:drop-shadow-xl transition-all duration-300'>
          Hello from KKM Infra! 👋
        </h1>
        <p className='text-base sm:text-lg md:text-xl lg:text-2xl max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg leading-relaxed sm:leading-relaxed md:leading-relaxed font-normal tracking-normal drop-shadow-sm dark:drop-shadow-lg opacity-95 dark:opacity-100 mb-4 sm:mb-5 md:mb-6 transition-all duration-300'>
          Make your work easier and organized with KKM Infra productive through
          automation and save tons of times!
        </p>
        <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
          <Badge
            variant='outline'
            className='bg-white/5 dark:bg-white/10 backdrop-blur-sm border-none text-white/70 dark:text-white/80 hover:text-white/90 px-2.5 py-1 text-xs font-normal transition-all duration-300'
          >
            <Zap className='h-3 w-3 opacity-70' />
            <span>Productivity</span>
          </Badge>
          <Badge
            variant='outline'
            className='bg-white/5 dark:bg-white/10 backdrop-blur-sm border-none text-white/70 dark:text-white/80 hover:text-white/90 px-2.5 py-1 text-xs font-normal transition-all duration-300'
          >
            <Clock className='h-3 w-3 opacity-70' />
            <span>Time Saving</span>
          </Badge>
          <Badge
            variant='outline'
            className='bg-white/5 dark:bg-white/10 backdrop-blur-sm border-none text-white/70 dark:text-white/80 hover:text-white/90 px-2.5 py-1 text-xs font-normal transition-all duration-300'
          >
            <TrendingUp className='h-3 w-3 opacity-70' />
            <span>Automation</span>
          </Badge>
          <Badge
            variant='outline'
            className='bg-white/5 dark:bg-white/10 backdrop-blur-sm border-none text-white/70 dark:text-white/80 hover:text-white/90 px-2.5 py-1 text-xs font-normal transition-all duration-300'
          >
            <Shield className='h-3 w-3 opacity-70' />
            <span>Secure</span>
          </Badge>
        </div>
      </div>
    </div>
  );
}
