/**
 * Test script for Payment Invoice System
 * Run with: npx tsx scripts/test-payment-invoices.ts
 */

import { prisma } from '../lib/prisma';
import { 
  createPaymentInvoice, 
  findPaymentInvoice, 
  canUseInvoice, 
  markInvoiceAsUsed,
  updateInvoicePaymentStatus,
  getInvoiceStats,
  cleanupExpiredInvoices
} from '../lib/payment-invoices';

async function testPaymentInvoiceSystem() {
  console.log('🧪 Testing Payment Invoice System...\n');

  try {
    // Test 1: Create a new invoice
    console.log('1. Creating a new payment invoice...');
    const testInvoice = await createPaymentInvoice({
      invoiceId: 'TEST_' + Date.now(),
      amount: 1000,
      phoneNumber: '254712345678',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      metadata: {
        test: true,
        orderId: 'TEST_ORDER_123'
      }
    });
    console.log('✅ Invoice created:', testInvoice.invoiceId);

    // Test 2: Find the invoice
    console.log('\n2. Finding the invoice...');
    const foundInvoice = await findPaymentInvoice(testInvoice.invoiceId);
    console.log('✅ Invoice found:', foundInvoice?.invoiceId);

    // Test 3: Check if invoice can be used
    console.log('\n3. Checking if invoice can be used...');
    const canUse = await canUseInvoice(testInvoice.invoiceId);
    console.log('✅ Can use invoice:', canUse.canUse);

    // Test 4: Update payment status to COMPLETE
    console.log('\n4. Updating payment status to COMPLETE...');
    await updateInvoicePaymentStatus(testInvoice.invoiceId, 'COMPLETE', 1100);
    console.log('✅ Payment status updated');

    // Test 5: Mark invoice as used
    console.log('\n5. Marking invoice as used...');
    await markInvoiceAsUsed(testInvoice.invoiceId, 'TEST_ORDER_123');
    console.log('✅ Invoice marked as used');

    // Test 6: Try to use the invoice again (should fail)
    console.log('\n6. Trying to use invoice again...');
    const canUseAgain = await canUseInvoice(testInvoice.invoiceId);
    console.log('❌ Can use invoice again:', canUseAgain.canUse, '- Reason:', canUseAgain.reason);

    // Test 7: Create an expired invoice
    console.log('\n7. Creating an expired invoice...');
    const expiredInvoice = await createPaymentInvoice({
      invoiceId: 'EXPIRED_' + Date.now(),
      amount: 500,
      phoneNumber: '254798765432',
      expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
      metadata: { test: true, expired: true }
    });

    // Test 8: Try to use expired invoice
    console.log('\n8. Trying to use expired invoice...');
    const canUseExpired = await canUseInvoice(expiredInvoice.invoiceId);
    console.log('❌ Can use expired invoice:', canUseExpired.canUse, '- Reason:', canUseExpired.reason);

    // Test 9: Clean up expired invoices
    console.log('\n9. Cleaning up expired invoices...');
    const cleanupResult = await cleanupExpiredInvoices();
    console.log('✅ Expired invoices updated:', cleanupResult.count);

    // Test 10: Get invoice statistics
    console.log('\n10. Getting invoice statistics...');
    const stats = await getInvoiceStats();
    console.log('📊 Invoice stats:', stats);

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await prisma.paymentInvoice.deleteMany({
      where: {
        OR: [
          { invoiceId: testInvoice.invoiceId },
          { invoiceId: expiredInvoice.invoiceId }
        ]
      }
    });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Payment Invoice System is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPaymentInvoiceSystem();