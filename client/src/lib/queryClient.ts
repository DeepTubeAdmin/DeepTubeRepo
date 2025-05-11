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
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (res.status === 401) {
      console.warn(`API request to ${url} returned 401 (Unauthorized)`);
      // Don't throw for 401, let the calling function handle it
      return res;
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`Error during API request to ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Extract the URL and parameters from queryKey
    const url = queryKey[0] as string;
    const params = queryKey[1] as Record<string, any> | undefined;
    
    // If we have parameters, add them as URL query parameters
    let finalUrl = url;
    if (params) {
      const searchParams = new URLSearchParams();
      
      // Add each parameter to the URL
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      
      // Add search params to URL if there are any
      const searchString = searchParams.toString();
      if (searchString) {
        finalUrl = `${url}?${searchString}`;
      }
    }
    
    console.log('Making API request to:', finalUrl);
    
    try {
      const res = await fetch(finalUrl, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
        }
      });

      if (res.status === 401) {
        console.warn(`Authentication failed for GET ${finalUrl} - received 401 Unauthorized`);
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Error fetching ${finalUrl}:`, error);
      throw error;
    }
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
