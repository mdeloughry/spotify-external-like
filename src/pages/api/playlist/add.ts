import type { APIRoute } from 'astro';
import { getTokenFromCookies, getRefreshTokenFromCookies, refreshAccessToken } from '../../../lib/auth';
import { addToPlaylist } from '../../../lib/spotify';

export const POST: APIRoute = async ({ request }) => {
  let token = getTokenFromCookies(request.headers.get('cookie'));
  const refreshToken = getRefreshTokenFromCookies(request.headers.get('cookie'));

  if (!token && !refreshToken) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (!token && refreshToken) {
    try {
      const tokens = await refreshAccessToken(refreshToken);
      token = tokens.access_token;
      headers.append(
        'Set-Cookie',
        `spotify_access_token=${tokens.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${tokens.expires_in}`
      );
      if (tokens.refresh_token) {
        headers.append(
          'Set-Cookie',
          `spotify_refresh_token=${tokens.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
        );
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const body = await request.json();
    const { playlistId, trackUri } = body;

    if (!playlistId || !trackUri) {
      return new Response(JSON.stringify({ error: 'Missing playlistId or trackUri' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await addToPlaylist(playlistId, trackUri, token!);

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (err) {
    console.error('Add to playlist error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to add to playlist' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
