import type { APIRoute } from 'astro';
import { exchangeCodeForTokens, parseCookies } from '../../../lib/auth';
import { getCookieOptions } from '../../../lib/api/security';
import { COOKIES } from '../../../lib/constants';

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
  const storedState = cookies[COOKIES.AUTH_STATE];

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

    const headers = new Headers();
    headers.append('Location', '/');
    headers.append(
      'Set-Cookie',
      `${COOKIES.ACCESS_TOKEN}=${tokens.access_token}; ${getCookieOptions(tokens.expires_in)}`
    );
    headers.append(
      'Set-Cookie',
      `${COOKIES.REFRESH_TOKEN}=${tokens.refresh_token}; ${getCookieOptions(COOKIES.REFRESH_TOKEN_MAX_AGE)}`
    );
    // Clear the state cookie
    headers.append(
      'Set-Cookie',
      `${COOKIES.AUTH_STATE}=; ${getCookieOptions(0)}`
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
