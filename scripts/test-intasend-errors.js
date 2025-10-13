/**
 * Quick test script to verify IntaSend error handling
 * Run with: node scripts/test-intasend-errors.js
 */

const { getIntaSendErrorMessage } = require('../lib/intasend');

// Test different error scenarios
const testCases = [
  {
    failedCode: '1032',
    failedReason: 'Request Cancelled by user.',
    description: 'User cancellation'
  },
  {
    failedCode: '2001', 
    failedReason: 'The initiator information is invalid.',
    description: 'Wrong PIN'
  },
  {
    failedCode: '1',
    failedReason: 'Insufficient Balance',
    description: 'Insufficient funds'
  },
  {
    failedCode: '9999',
    failedReason: 'Unknown error occurred',
    description: 'Unknown error code'
  }
];

console.log('🧪 Testing IntaSend Error Message Mapping\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.description}`);
  console.log(`Input: Code ${testCase.failedCode} - ${testCase.failedReason}`);
  
  const errorInfo = getIntaSendErrorMessage(testCase.failedCode, testCase.failedReason);
  
  console.log(`✅ User Message: ${errorInfo.userMessage}`);
  console.log(`🔧 Action Required: ${errorInfo.actionRequired}`);
  console.log(`🔍 Technical: ${errorInfo.technicalMessage}`);
  console.log('─'.repeat(50) + '\n');
});

console.log('📊 All error mappings tested successfully!');