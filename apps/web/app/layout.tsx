import type { Metadata } from 'next';
import { Geist, Inter } from 'next/font/google';
import './globals.css';
import { ReactQueryProvider } from './react-query-provider';
import { AppTooltipProvider } from '@/components/app-tooltip-provider';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { cn } from '@/lib/utils';

const geistHeading = Geist({ subsets: ['latin'], variable: '--font-heading' });

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'KKM Infra - Construction Management System',
  description: 'KKM Infra',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={cn('font-sans', inter.variable, geistHeading.variable)}
    >
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>
            <ReactQueryProvider>
              <AppTooltipProvider>{children}</AppTooltipProvider>
            </ReactQueryProvider>
            <Toaster
              closeButton
              toastOptions={{ duration: 3000 }}
              position='top-center'
            />
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
