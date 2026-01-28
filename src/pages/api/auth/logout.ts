import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const headers = new Headers();
  headers.append('Location', '/');
  headers.append(
    'Set-Cookie',
    'spotify_access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
  headers.append(
    'Set-Cookie',
    'spotify_refresh_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );

  return new Response(null, {
    status: 302,
    headers,
  });
};
