"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  
  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/trpc",
            headers() {
              // Get auth token from localStorage (dynamic on each request)
              const token = typeof window !== "undefined" 
                ? localStorage.getItem("auth_token") 
                : null;
              
              return {
                authorization: token ? `Bearer ${token}` : "",
              };
            },
          }),
        ],
      }),
    []
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

