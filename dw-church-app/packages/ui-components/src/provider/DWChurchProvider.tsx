import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DWChurchClientContext, type DWChurchClient } from '@dw-church/api-client';

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export interface DWChurchProviderProps {
  client: DWChurchClient;
  queryClient?: QueryClient;
  children: ReactNode;
}

export function DWChurchProvider({
  client,
  queryClient = defaultQueryClient,
  children,
}: DWChurchProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <DWChurchClientContext.Provider value={client}>
        {children}
      </DWChurchClientContext.Provider>
    </QueryClientProvider>
  );
}
