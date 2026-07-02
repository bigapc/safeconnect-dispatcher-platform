import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        retry: 1,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Request failed';
        toast.error(message);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Request failed';
        toast.error(message);
      },
    }),
  });
