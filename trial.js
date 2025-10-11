import axios from 'axios';

const payViaLink = async () => {
  try {
    const response = await axios.post(
      'https://lipia-api.kreativelabske.com/api/pay-via-link',
      {
        phone: '0705423479',
        amount: 10,
        link_slug: 'poultry-market',
      },
      {
        headers: {
          Authorization: 'Bearer ', 
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Payment initiated:', response.data);
  } catch (error) {
    console.error('Payment error:', error.response?.data || error.message);
  }
};

payViaLink();
