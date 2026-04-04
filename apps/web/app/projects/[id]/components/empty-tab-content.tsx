import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmptyTabContentProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

export function EmptyTabContent({
  icon: Icon,
  title,
  description,
}: EmptyTabContentProps) {
  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-lg font-semibold'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='text-center py-12'>
          <Icon className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <h3 className='text-lg font-semibold text-muted-foreground mb-2'>
            {title}
          </h3>
          <p className='text-sm text-muted-foreground max-w-md mx-auto'>
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
