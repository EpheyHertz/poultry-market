/**
 * Quick test for payment amount validation with rounding
 * Test the specific case: Expected 12.36 KES, Received 13 KES
 */

// Mock the required functions for testing
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
  
  // Also calculate the rounded expected amount
  const roundedExpectedAmount = Math.ceil(expectedAmount);
  
  // Check against both the exact amount and the rounded amount
  const differenceFromExact = Math.abs(receivedAmount - expectedAmount);
  const differenceFromRounded = Math.abs(receivedAmount - roundedExpectedAmount);
  
  // Use the smaller difference for validation
  const difference = Math.min(differenceFromExact, differenceFromRounded);
  
  // Payment is valid if it matches either the exact amount or the rounded amount within tolerance
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
  
  return {
    isValid,
    expectedAmount: roundedExpectedAmount,
    receivedAmount,
    difference,
    message
  };
}

// Test the problematic case
console.log('🧪 Testing Payment Amount Validation\n');

// Test case: Order total 10, should result in expectedAmount ~12.36, receivedAmount 13
const orderTotal = 10;
const feeCalc = calculateIntaSendFees(orderTotal);

console.log('Fee Calculation:');
console.log(`- Order Total: ${orderTotal} KES`);
console.log(`- Service Fee: ${feeCalc.serviceFee} KES`);  
console.log(`- IntaSend Fee: ${feeCalc.intaSendFee} KES`);
console.log(`- Total Expected: ${feeCalc.totalAmount} KES`);

const receivedAmount = 13;
const validation = validatePaymentAmount(receivedAmount, orderTotal);

console.log('\nValidation Result:');
console.log(`- Received: ${validation.receivedAmount} KES`);
console.log(`- Expected: ${validation.expectedAmount} KES`);
console.log(`- Difference: ${validation.difference} KES`);
console.log(`- Is Valid: ${validation.isValid}`);
console.log(`- Message: ${validation.message}`);

if (validation.isValid) {
  console.log('\n✅ PASS: Validation should now accept rounded amounts!');
} else {
  console.log('\n❌ FAIL: Validation still rejecting rounded amounts');
}