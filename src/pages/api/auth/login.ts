import type { APIRoute } from 'astro';
import { getAuthUrl, generateState } from '../../../lib/auth';

export const GET: APIRoute = async () => {
  const state = generateState();
  const authUrl = getAuthUrl(state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      'Set-Cookie': `spotify_auth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    },
  });
};
