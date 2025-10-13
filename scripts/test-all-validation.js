/**
 * Comprehensive test for payment amount validation scenarios
 */

// Import the validation function (simulated for testing)
function calculateIntaSendFees(amount) {
  const subtotal = parseFloat(amount);
  const serviceFee = amount >= 50 ? 4 : 2;
  const amountWithServiceFee = subtotal + serviceFee;
  const intaSendFee = Math.round((amountWithServiceFee * 0.03) * 100) / 100;
  const totalAmount = amountWithServiceFee + intaSendFee;
  
  return {
    subtotal,
    intaSendFee,
    serviceFee,
    totalAmount: Math.round(totalAmount * 100) / 100,
    netAmount: Math.round(amountWithServiceFee * 100) / 100
  };
}

function validatePaymentAmount(receivedAmount, expectedOrderTotal, tolerance = 1.0) {
  const feeCalculation = calculateIntaSendFees(expectedOrderTotal);
  const expectedAmount = feeCalculation.totalAmount;
  const roundedExpectedAmount = Math.ceil(expectedAmount);
  const differenceFromExact = Math.abs(receivedAmount - expectedAmount);
  const differenceFromRounded = Math.abs(receivedAmount - roundedExpectedAmount);
  const difference = Math.min(differenceFromExact, differenceFromRounded);
  const isValid = difference <= tolerance;
  
  let message = '';
  if (isValid) {
    if (receivedAmount === roundedExpectedAmount && receivedAmount !== expectedAmount) {
      message = `Payment amount verified successfully (rounded up from ${expectedAmount} to ${roundedExpectedAmount} KES)`;
    } else {
      message = 'Payment amount verified successfully';
    }
  } else {
    const expectedRange = expectedAmount === roundedExpectedAmount 
      ? `${expectedAmount} KES`
      : `${expectedAmount} KES (or ${roundedExpectedAmount} KES rounded)`;
    
    if (receivedAmount < expectedAmount) {
      message = `Payment amount too low. Expected: ${expectedRange}, Received: ${receivedAmount} KES`;
    } else {
      message = `Payment amount too high. Expected: ${expectedRange}, Received: ${receivedAmount} KES`;
    }
  }
  
  return { isValid, expectedAmount: roundedExpectedAmount, receivedAmount, difference, message };
}

console.log('🧪 Comprehensive Payment Validation Tests\n');

const testCases = [
  {
    description: 'Exact amount match',
    orderTotal: 10,
    receivedAmount: 12.36,
    expectedResult: true
  },
  {
    description: 'Rounded up amount (the problematic case)',
    orderTotal: 10,
    receivedAmount: 13,
    expectedResult: true
  },
  {
    description: 'Whole number amount',
    orderTotal: 50,
    receivedAmount: 56,
    expectedResult: true
  },
  {
    description: 'Amount too low',
    orderTotal: 10,
    receivedAmount: 11,
    expectedResult: false
  },
  {
    description: 'Amount way too high',
    orderTotal: 10,
    receivedAmount: 20,
    expectedResult: false
  }
];

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.description}`);
  
  const feeCalc = calculateIntaSendFees(test.orderTotal);
  const validation = validatePaymentAmount(test.receivedAmount, test.orderTotal);
  
  console.log(`  Order: ${test.orderTotal} KES → Expected: ${feeCalc.totalAmount} KES → Rounded: ${Math.ceil(feeCalc.totalAmount)} KES`);
  console.log(`  Received: ${test.receivedAmount} KES`);
  console.log(`  Result: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`  Message: ${validation.message}`);
  
  if (validation.isValid === test.expectedResult) {
    console.log(`  🎯 PASS: Expected ${test.expectedResult}, got ${validation.isValid}`);
  } else {
    console.log(`  💥 FAIL: Expected ${test.expectedResult}, got ${validation.isValid}`);
  }
  
  console.log('');
});

console.log('✨ All tests completed!');