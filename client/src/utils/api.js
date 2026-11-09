/**
 * Safe fetch helper that handles JSON responses and extracts meaningful errors
 * instead of letting response.json() fail on non-JSON/HTML responses.
 */
export async function safeFetch(url, options = {}) {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';

  let data = null;
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (data && data.error) {
      throw new Error(data.error);
    }
    const text = !data ? await res.text().catch(() => '') : '';
    const preview = text ? ` - ${text.slice(0, 120).replace(/<[^>]+>/g, '').trim()}` : '';
    throw new Error(`Server returned error (${res.status} ${res.statusText})${preview}`);
  }

  if (!data) {
    throw new Error('Server returned unexpected non-JSON response');
  }

  return data;
}
