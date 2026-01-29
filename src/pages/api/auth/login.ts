import type { APIRoute } from 'astro';
import { getAuthUrl, generateState } from '../../../lib/auth';
import { getCookieOptions } from '../../../lib/api/security';
import { COOKIES } from '../../../lib/constants';

export const GET: APIRoute = async () => {
  const state = generateState();
  const authUrl = getAuthUrl(state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      'Set-Cookie': `${COOKIES.AUTH_STATE}=${state}; ${getCookieOptions(COOKIES.AUTH_STATE_MAX_AGE)}`,
    },
  });
};
