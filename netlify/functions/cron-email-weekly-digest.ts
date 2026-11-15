import { schedule } from '@netlify/functions';
import { invokeCron } from './cron-shared';

export const handler = schedule('0 9 * * 1', async () => {
  return invokeCron('/api/cron/email/weekly-digest');
});
