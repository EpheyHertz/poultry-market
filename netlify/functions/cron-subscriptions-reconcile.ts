import { schedule } from '@netlify/functions';
import { invokeCron } from './cron-shared';

export const handler = schedule('0 0 * * *', async () => {
  return invokeCron('/api/cron/subscriptions/reconcile');
});
