import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Add access key header if available
  const accessKey = localStorage.getItem('tplay_access_key');
  const keyExpires = localStorage.getItem('tplay_key_expires');
  const hasValidKey = accessKey && keyExpires && Date.now() < parseInt(keyExpires);
  
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (hasValidKey) {
    headers["x-access-key"] = accessKey;
    headers["x-full-access"] = "true";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Add access key header if available
    const accessKey = localStorage.getItem('tplay_access_key');
    const keyExpires = localStorage.getItem('tplay_key_expires');
    const hasValidKey = accessKey && keyExpires && Date.now() < parseInt(keyExpires);
    
    const headers: Record<string, string> = {};
    if (hasValidKey) {
      headers["x-access-key"] = accessKey;
      headers["x-full-access"] = "true";
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
