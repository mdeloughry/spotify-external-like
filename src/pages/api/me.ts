import { getCurrentUser } from '../../lib/spotify';
import { withApiHandler } from '../../lib/api-utils';
import { RATE_LIMIT, API_PATHS } from '../../lib/constants';

export const GET = withApiHandler(
  async ({ token, headers, logger }) => {
    const user = await getCurrentUser(token);
    logger.info(200);
    return new Response(JSON.stringify(user), { status: 200, headers });
  },
  {
    path: API_PATHS.ME,
    method: 'GET',
    rateLimit: RATE_LIMIT.ME,
  }
);
