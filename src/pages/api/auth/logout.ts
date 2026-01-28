import type { APIRoute } from 'astro';
import { COOKIES } from '../../../lib/constants';
import { getCookieOptions } from '../../../lib/api/security';

export const GET: APIRoute = async () => {
  const headers = new Headers();
  headers.append('Location', '/');
  // Clear cookies by setting Max-Age=0
  headers.append(
    'Set-Cookie',
    `${COOKIES.ACCESS_TOKEN}=; ${getCookieOptions(0)}`
  );
  headers.append(
    'Set-Cookie',
    `${COOKIES.REFRESH_TOKEN}=; ${getCookieOptions(0)}`
  );

  return new Response(null, {
    status: 302,
    headers,
  });
};
