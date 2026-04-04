import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Construction, Clock, Zap } from 'lucide-react';
import { PageLayout } from '@/components/layouts/page-layout';

interface ComingSoonPageProps {
  title: string;
  description?: string;
  features?: string[];
}

export function ComingSoonPage({
  title,
  description = 'This feature is currently under development and will be available soon.',
}: ComingSoonPageProps) {
  return (
    <PageLayout title={title}>
      <div className='container mx-auto px-4 py-8'>
        <div className='max-w-2xl mx-auto'>
          <Card className='border-dashed'>
            <CardHeader className='text-center'>
              <div className='mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted'>
                <Construction className='h-10 w-10 text-muted-foreground' />
              </div>
              <CardTitle className='text-2xl font-bold'>{title}</CardTitle>
              <CardDescription className='text-lg'>
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='flex items-center justify-center space-x-2'>
                <Badge
                  variant='secondary'
                  className='flex items-center space-x-1'
                >
                  <Clock className='h-3 w-3' />
                  <span>Coming Soon</span>
                </Badge>
                <Badge
                  variant='outline'
                  className='flex items-center space-x-1'
                >
                  <Zap className='h-3 w-3' />
                  <span>Under Development</span>
                </Badge>
              </div>

              <div className='text-center text-sm text-muted-foreground'>
                <p>
                  We are working hard to bring you this feature. Check back
                  soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
