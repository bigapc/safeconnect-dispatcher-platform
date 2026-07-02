'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { createQueryClient } from '@/lib/query-client';

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    const handler = (event: Event): void => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) {
        toast.error(customEvent.detail);
      }
    };

    window.addEventListener('safeconnect:api-error', handler);
    return () => {
      window.removeEventListener('safeconnect:api-error', handler);
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
};
