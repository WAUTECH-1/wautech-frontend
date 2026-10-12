export function devProxyTarget(value?: string): string {
  const target = value || 'http://localhost:8080';
  const url = new URL(target);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'WAUTECH_DEV_API_TARGET must be a backend origin without credentials or paths.',
    );
  return url.origin;
}
