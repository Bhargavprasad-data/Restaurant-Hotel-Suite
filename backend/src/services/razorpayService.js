require('dotenv').config();

let razorpayInstance = null;
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (keyId && keySecret) {
  try {
    const Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    console.log('Razorpay Client initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Razorpay. Running in sandbox mode:', error.message);
  }
} else {
  console.log('Razorpay credentials missing. Running payment gateway in Sandbox Simulator Mode.');
}

/**
 * Creates a payment transaction order and computes the secure checkout link.
 * @param {string} orderId Database UUID of the order
 * @param {number} amount Grand total amount
 * @returns {Promise<{razorpayOrderId: string, paymentLink: string, mock: boolean}>}
 */
const createPaymentOrder = async (orderId, amount, reqFrontendUrl) => {
  const amountInPaise = Math.round(amount * 100); // Razorpay processes currency in minor units (paise)

  if (razorpayInstance) {
    try {
      const option = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${orderId.substring(0, 8)}`,
      };
      const response = await razorpayInstance.orders.create(option);
      
      const frontendUrl = reqFrontendUrl || process.env.FRONTEND_URL || 'http://localhost:5174';
      const paymentLink = `${frontendUrl}/checkout/simulated?order_id=${orderId}&razorpay_order_id=${response.id}&amount=${amount}`;
      
      return {
        razorpayOrderId: response.id,
        paymentLink,
        mock: false,
      };
    } catch (error) {
      console.error('Razorpay API error, falling back to mock payment order:', error.message);
      return generateMockOrder(orderId, amount, reqFrontendUrl);
    }
  } else {
    return generateMockOrder(orderId, amount, reqFrontendUrl);
  }
};

const generateMockOrder = (orderId, amount, reqFrontendUrl) => {
  const mockRazorpayId = `order_mock_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const frontendUrl = reqFrontendUrl || process.env.FRONTEND_URL || 'http://localhost:5174';
  const paymentLink = `${frontendUrl}/checkout/simulated?order_id=${orderId}&razorpay_order_id=${mockRazorpayId}&amount=${amount}`;

  return {
    razorpayOrderId: mockRazorpayId,
    paymentLink,
    mock: true,
  };
};

module.exports = {
  createPaymentOrder,
};
