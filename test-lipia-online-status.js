const checkPaymentStatus = async (transactionReference) => {
   
  try {
    const response = await fetch(
      `https://lipia-api.kreativelabske.com/api/v2/payments/status?reference=${transactionReference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LIPIA_API_KEY}`
        }
      }
    );
 
    const result = await response.json();
    
    if (result.success) {
      const paymentData = result.data.response;
      console.log('Payment Status:', paymentData.Status);
      console.log('Amount:', paymentData.Amount);
      console.log('Receipt Number:', paymentData.MpesaReceiptNumber);
      return paymentData;
    } else {
      console.error('Status check failed:', result.message);
      throw new Error(result.customerMessage);
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    throw error;
  }
};
 
// Usage
const transactionRef = '68eb40b3e309909e96651c76';
checkPaymentStatus(transactionRef);