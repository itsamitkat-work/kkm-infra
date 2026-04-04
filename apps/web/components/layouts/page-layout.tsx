interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return <div className='container mx-auto px-4 py-8'>{children}</div>;
}
