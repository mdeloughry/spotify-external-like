import type { APIRoute } from 'astro';
import { getAuthUrl, generateState } from '../../../lib/auth';
import { getCookieOptions } from '../../../lib/api/security';
import { COOKIES } from '../../../lib/constants';

export const GET: APIRoute = async () => {
  const state = generateState();
  // Force consent dialog to ensure users authorize new scopes (e.g., playback control)
  const authUrl = getAuthUrl(state, true);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      'Set-Cookie': `${COOKIES.AUTH_STATE}=${state}; ${getCookieOptions(COOKIES.AUTH_STATE_MAX_AGE)}`,
    },
  });
};
