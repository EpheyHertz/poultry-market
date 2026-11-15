import { schedule } from '@netlify/functions';
import { invokeCron } from './cron-shared';

export const handler = schedule('0 6 * * *', async () => {
  return invokeCron('/api/cron/farm/daily');
});
