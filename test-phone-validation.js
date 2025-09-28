// Simple test for phone validation
function normalizePhoneNumber(phoneNumber) {
  let normalized = phoneNumber.replace(/[\s-]/g, '');
  
  if (normalized.startsWith('+254')) {
    return normalized.substring(1);
  } else if (normalized.startsWith('254')) {
    return normalized;
  } else if (normalized.startsWith('07') || normalized.startsWith('01')) {
    return '254' + normalized.substring(1);
  } else if (normalized.startsWith('7') || normalized.startsWith('1')) {
    return '254' + normalized;
  }
  
  return normalized;
}

function validatePhoneNumber(phoneNumber) {
  const cleanNumber = phoneNumber.replace(/[\s-]/g, '');
  const inputValidation = /^(\+254|254)[0-9]{9}$|^0[7|1][0-9]{8}$/;
  
  if (!inputValidation.test(cleanNumber)) {
    return { isValid: false, error: 'Invalid input format' };
  }
  
  const normalized = normalizePhoneNumber(cleanNumber);
  const finalValidation = /^254[0-9]{9}$/;
  
  if (!finalValidation.test(normalized)) {
    return { isValid: false, error: 'Invalid normalized format', normalized };
  }
  
  return { isValid: true, normalized };
}

// Test the problematic number
const testNumber = '0700086852';
console.log('Testing:', testNumber);
console.log('Result:', validatePhoneNumber(testNumber));

// Test other numbers
const testNumbers = ['0712345678', '254700086852', '+254700086852'];
testNumbers.forEach(num => {
  console.log(`${num}:`, validatePhoneNumber(num));
});