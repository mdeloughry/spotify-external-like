/**
 * Authentication middleware utilities
 */

import { getTokenFromCookies, getRefreshTokenFromCookies, refreshAccessToken } from '../auth';
import { addSecurityHeaders, getCookieOptions } from './security';
import { COOKIES } from '../constants';

export interface AuthResult {
  token: string;
  headers: Headers;
}

export type AuthSuccess = { success: true; data: AuthResult };
export type AuthFailure = { success: false; response: Response };
export type AuthCheckResult = AuthSuccess | AuthFailure;

/**
 * Get an authenticated token from request cookies, refreshing if necessary
 * @param request - The incoming request
 * @param baseHeaders - Optional base headers to extend
 * @returns Auth check result with token and headers, or error response
 */
export async function getAuthenticatedToken(
  request: Request,
  baseHeaders?: Headers
): Promise<AuthCheckResult> {
  const headers = baseHeaders || new Headers();
  headers.set('Content-Type', 'application/json');
  addSecurityHeaders(headers);

  let token = getTokenFromCookies(request.headers.get('cookie'));
  const refreshToken = getRefreshTokenFromCookies(request.headers.get('cookie'));

  if (!token && !refreshToken) {
    return {
      success: false,
      response: new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers,
      }),
    };
  }

  // Try to refresh token if access token is missing
  if (!token && refreshToken) {
    try {
      const tokens = await refreshAccessToken(refreshToken);
      token = tokens.access_token;

      // Set new access token cookie with proper security
      headers.append(
        'Set-Cookie',
        `${COOKIES.ACCESS_TOKEN}=${tokens.access_token}; ${getCookieOptions(tokens.expires_in)}`
      );

      // Update refresh token if a new one was provided
      if (tokens.refresh_token) {
        headers.append(
          'Set-Cookie',
          `${COOKIES.REFRESH_TOKEN}=${tokens.refresh_token}; ${getCookieOptions(COOKIES.REFRESH_TOKEN_MAX_AGE)}`
        );
      }
    } catch {
      return {
        success: false,
        response: new Response(JSON.stringify({ error: 'Session expired. Please log in again.' }), {
          status: 401,
          headers,
        }),
      };
    }
  }

  return {
    success: true,
    data: { token: token!, headers },
  };
}

/**
 * Type guard to check if auth result is successful
 */
export function isAuthSuccess(result: AuthCheckResult): result is AuthSuccess {
  return result.success === true;
}
