/**
 * Centralized API base URL configuration.
 *
 * Resolution order (first match wins):
 *   1. Non-empty `process.env.NEXT_PUBLIC_API_URL` — explicit override (production / docker)
 *   2. If current page runs on official localhost frontend port 7002, talk to localhost:7001
 *   3. In development bundles only, fallback localhost frontend ports also talk to localhost:7001
 *   4. `window.location.protocol + '//' + window.location.host` — same origin (gateway / proxy deployments)
 *
 * This supports:
 *   - dev: frontend `7002` or a fallback port -> backend `7001`
 *   - dev:gateway / prod gateway: browser hits same-origin `7000`
 *
 * This replaces all inline `http://localhost:7001` hardcodes across components.
 */

export function resolveDefaultApiUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:7001';

  const { protocol, hostname, host, port } = window.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isDevelopmentBundle = process.env.NODE_ENV !== 'production';

  // Official split frontend port always talks to the backend port.
  if (isLocalHost && port === '7002') {
    return `${protocol}//${hostname}:7001`;
  }

  // Local ad-hoc Next dev ports, e.g. 7013 during visual QA, should also use the backend.
  if (isLocalHost && isDevelopmentBundle && port !== '7000' && port !== '7001') {
    return `${protocol}//${hostname}:7001`;
  }

  return `${protocol}//${host}`;
}

/** Backend API base URL (without trailing slash) */
const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_URL: string = envApiUrl || resolveDefaultApiUrl();
