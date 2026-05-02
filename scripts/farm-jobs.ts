import {
  runDailyEggReminderJob,
  runFarmAlertsJob,
  runWeeklySummaryJob,
} from '../modules/eggs/email-jobs';
import { reconcileExpiredSubscriptions } from '../modules/subscriptions';

async function run(mode: string) {
  if (mode === 'daily') {
    const result = await runDailyEggReminderJob();
    console.log('Daily reminder job result:', result);
    return;
  }

  if (mode === 'weekly') {
    const result = await runWeeklySummaryJob();
    console.log('Weekly summary job result:', result);
    return;
  }

  if (mode === 'alerts') {
    const result = await runFarmAlertsJob();
    console.log('Farm alerts job result:', result);
    return;
  }

  if (mode === 'subscription-reconcile') {
    const count = await reconcileExpiredSubscriptions();
    console.log('Expired subscriptions reconciled:', count);
    return;
  }

  throw new Error(`Unknown mode: ${mode}. Use one of: daily, weekly, alerts, subscription-reconcile`);
}

const mode = process.argv[2] || 'daily';

run(mode)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Farm job failed:', error);
    process.exit(1);
  });
