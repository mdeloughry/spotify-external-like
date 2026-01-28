import type { APIRoute } from 'astro';
import { exchangeCodeForTokens, parseCookies } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Check for OAuth errors
  if (error) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/?error=${encodeURIComponent(error)}`,
      },
    });
  }

  // Validate state parameter
  const cookies = parseCookies(request.headers.get('cookie'));
  const storedState = cookies['spotify_auth_state'];

  if (!state || state !== storedState) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/?error=state_mismatch',
      },
    });
  }

  if (!code) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/?error=no_code',
      },
    });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Set cookies and redirect to home
    const cookieOptions = 'Path=/; HttpOnly; SameSite=Lax';
    const accessTokenMaxAge = tokens.expires_in;
    const refreshTokenMaxAge = 60 * 60 * 24 * 30; // 30 days

    const headers = new Headers();
    headers.append('Location', '/');
    headers.append(
      'Set-Cookie',
      `spotify_access_token=${tokens.access_token}; ${cookieOptions}; Max-Age=${accessTokenMaxAge}`
    );
    headers.append(
      'Set-Cookie',
      `spotify_refresh_token=${tokens.refresh_token}; ${cookieOptions}; Max-Age=${refreshTokenMaxAge}`
    );
    // Clear the state cookie
    headers.append(
      'Set-Cookie',
      `spotify_auth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
    );

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (err) {
    console.error('Token exchange error:', err);
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/?error=token_exchange_failed',
      },
    });
  }
};
