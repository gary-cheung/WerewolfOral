import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Guest username templates for random generation
const adjectives = ['Brave', 'Silent', 'Clever', 'Swift', 'Wise', 'Bold', 'Fierce', 'Noble', 'Quick', 'Sly'];
const animals = ['Wolf', 'Tiger', 'Fox', 'Eagle', 'Bear', 'Lion', 'Hawk', 'Raven', 'Owl', 'Lynx'];

function generateGuestUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const number = Math.floor(Math.random() * 900) + 100; // 100-999
  return `${adjective}${animal}${number}`;
}

// Auto-recreate guest session on 401
export async function recreateGuestSession(): Promise<void> {
  try {
    const username = generateGuestUsername();
    const response = await fetch('/api/users/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username })
    });
    
    if (!response.ok) {
      throw new Error('Failed to recreate guest session');
    }
    
    const user = await response.json();
    localStorage.setItem('guestUser', JSON.stringify(user));
  } catch (error) {
    console.error('Failed to recreate guest session:', error);
    throw error;
  }
}

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
  let res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // If 401, try to recreate session and retry once
  if (res.status === 401) {
    try {
      await recreateGuestSession();
      
      // Retry the original request
      res = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
    } catch (error) {
      console.error('Session recreation failed during apiRequest:', error);
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    // If 401, recreate session and retry once
    if (res.status === 401) {
      try {
        await recreateGuestSession();
        
        // Retry the original query after session recreation
        res = await fetch(queryKey.join("/") as string, {
          credentials: "include",
        });
        
        // If still 401 after retry and returnNull is configured, return null
        if (res.status === 401 && unauthorizedBehavior === "returnNull") {
          return null;
        }
      } catch (error) {
        console.error('Session recreation failed during query:', error);
        
        // If recreation failed and returnNull is configured, return null
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
      }
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
