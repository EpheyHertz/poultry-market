import { cleanupExpiredInvoices, getInvoiceStats } from '@/lib/payment-invoices';

/**
 * Cleanup script for expired payment invoices
 * This can be run as a cron job or manually
 */
async function cleanup() {
  console.log('Starting payment invoice cleanup...');
  
  try {
    // Get stats before cleanup
    const statsBefore = await getInvoiceStats();
    console.log('Invoice stats before cleanup:', statsBefore);
    
    // Cleanup expired invoices
    const result = await cleanupExpiredInvoices();
    console.log(`Marked ${result.count} invoices as expired`);
    
    // Get stats after cleanup
    const statsAfter = await getInvoiceStats();
    console.log('Invoice stats after cleanup:', statsAfter);
    
    console.log('Cleanup completed successfully');
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanup().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { cleanup };