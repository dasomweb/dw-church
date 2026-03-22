'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DWChurchClient, DWChurchClientContext } from '@dw-church/api-client';
import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  const [dwClient] = useState(() => new DWChurchClient({ baseUrl: API_BASE }));

  return (
    <QueryClientProvider client={queryClient}>
      <DWChurchClientContext.Provider value={dwClient}>
        {children}
      </DWChurchClientContext.Provider>
    </QueryClientProvider>
  );
}
