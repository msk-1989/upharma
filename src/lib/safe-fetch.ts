/**
 * Safe fetch wrapper that prevents "Unexpected token '<'" JSON parse errors.
 * When the server returns HTML (e.g., 502 proxy error page), this returns null
 * instead of throwing a SyntaxError.
 */
export async function safeJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(input, init);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Same as safeJson but for use in .then() chains.
 */
export function safeJsonThen(r: Response): Promise<any> {
  if (!r.ok) return Promise.resolve(null);
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return Promise.resolve(null);
  return r.json().catch(() => null);
}
