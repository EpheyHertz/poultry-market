/**
 * Test script for Payment Amount Rounding
 * Run with: npx tsx scripts/test-amount-rounding.ts
 */

import { roundUpPaymentAmount, validatePaymentAmount, calculateIntaSendFees } from '../lib/intasend';

function testAmountRounding() {
  console.log('🧪 Testing Payment Amount Rounding...\n');

  // Test cases for rounding
  const testCases = [
    { input: 12.36, expected: 13 },
    { input: 12.00, expected: 12 },
    { input: 12.01, expected: 13 },
    { input: 12.99, expected: 13 },
    { input: 100.50, expected: 101 },
    { input: 1000, expected: 1000 },
  ];

  console.log('1. Testing roundUpPaymentAmount function:');
  testCases.forEach(({ input, expected }) => {
    const result = roundUpPaymentAmount(input);
    const passed = result === expected;
    console.log(`   ${input} → ${result} ${passed ? '✅' : '❌'} (expected: ${expected})`);
  });

  console.log('\n2. Testing payment validation with rounding:');
  
  // Test order amount: 1000 KES
  const orderAmount = 1000;
  const fees = calculateIntaSendFees(orderAmount);
  console.log(`   Order amount: ${orderAmount} KES`);
  console.log(`   Expected total with fees: ${fees.totalAmount} KES`);
  console.log(`   Rounded expected total: ${roundUpPaymentAmount(fees.totalAmount)} KES`);

  // Test different received amounts
  const receivedAmounts = [
    fees.totalAmount, // Exact amount
    fees.totalAmount + 0.36, // Amount with decimals
    Math.ceil(fees.totalAmount), // Rounded up amount
    fees.totalAmount + 1.5, // Higher amount that should round up
    fees.totalAmount - 5, // Too low amount
  ];

  receivedAmounts.forEach(receivedAmount => {
    const roundedReceived = roundUpPaymentAmount(receivedAmount);
    const validation = validatePaymentAmount(roundedReceived, orderAmount);
    
    console.log(`\n   Received: ${receivedAmount} → Rounded: ${roundedReceived}`);
    console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`);
    console.log(`   Message: ${validation.message}`);
  });

  console.log('\n🎉 Amount rounding tests completed!');
}

// Run the test
testAmountRounding();