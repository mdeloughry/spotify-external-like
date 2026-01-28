import type { APIRoute } from 'astro';
import { getTokenFromCookies, getRefreshTokenFromCookies, refreshAccessToken } from '../../lib/auth';
import { getPlaylists } from '../../lib/spotify';

export const GET: APIRoute = async ({ request }) => {
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
    const playlistsResponse = await getPlaylists(token!);

    return new Response(
      JSON.stringify({
        playlists: playlistsResponse.items,
        total: playlistsResponse.total,
      }),
      { headers }
    );
  } catch (err) {
    console.error('Get playlists error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to get playlists' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
