require('dotenv').config();

let twilioClient = null;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

if (accountSid && authToken && twilioPhone) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    console.log('Twilio Client initialized successfully for WhatsApp notifications.');
  } catch (error) {
    console.error('Failed to initialize Twilio client. Reverting to sandbox mode:', error.message);
  }
} else {
  console.log('Twilio credentials missing. Running WhatsApp service in Sandbox Simulator Mode.');
}

/**
 * Sends a WhatsApp notification containing the billing information and a digital checkout link.
 * @param {string} toPhone The customer mobile number (e.g. +919876543210)
 * @param {string} customerName The customer's name
 * @param {string} tableName Table code
 * @param {number} amount Total price
 * @param {string} paymentLink Checkout page URL
 */
const sendWhatsAppBill = async (toPhone, customerName, tableName, amount, paymentLink) => {
  // Format phone number to clean E.164 if necessary
  let formattedPhone = toPhone.trim();
  if (!formattedPhone.startsWith('+')) {
    // Default to Indian prefix (+91) if it's a 10-digit number, otherwise keep as is
    if (formattedPhone.length === 10) {
      formattedPhone = `+91${formattedPhone}`;
    } else {
      formattedPhone = `+${formattedPhone}`;
    }
  }

  const messageBody = `Hello ${customerName}! 🍽️\n\nThank you for dining with us at Tasty Bites. Your bill for Table ${tableName} is generated.\n\n💵 *Total Amount:* ₹${amount}\n🔗 *Secure Payment Link:* ${paymentLink}\n\nPlease click the link above to complete your online payment. Once completed, a green receipt will be generated automatically for your checkout exit pass!\n\nWe hope to serve you again soon! ⭐`;

  if (twilioClient) {
    try {
      const message = await twilioClient.messages.create({
        from: `whatsapp:${twilioPhone}`,
        to: `whatsapp:${formattedPhone}`,
        body: messageBody,
      });
      console.log(`WhatsApp message dispatched to ${formattedPhone} (SID: ${message.sid})`);
      return { success: true, sid: message.sid, mock: false };
    } catch (error) {
      console.error(`Twilio Error. Dispatched SMS fell back to system logger:`, error.message);
      printMockWhatsApp(formattedPhone, messageBody);
      return { success: true, mock: true, error: error.message };
    }
  } else {
    printMockWhatsApp(formattedPhone, messageBody);
    return { success: true, mock: true };
  }
};

const printMockWhatsApp = (to, body) => {
  console.log('\n======================================================');
  console.log('📲  SIMULATED WHATSAPP NOTIFICATION DISPATCHED');
  console.log(`👤  To: ${to}`);
  console.log('------------------------------------------------------');
  console.log(body);
  console.log('======================================================\n');
};

const sendWhatsAppCheckoutReminder = async (toPhone, customerName, roomNumber, checkOutTime) => {
  let formattedPhone = toPhone.trim();
  if (!formattedPhone.startsWith('+')) {
    if (formattedPhone.length === 10) {
      formattedPhone = `+91${formattedPhone}`;
    } else {
      formattedPhone = `+${formattedPhone}`;
    }
  }

  const dateObj = new Date(checkOutTime);
  const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const messageBody = `Hello ${customerName}! 🛎️\n\nThis is a friendly reminder that your stay in Room ${roomNumber} is scheduled for auto-checkout in 5 minutes at ${formattedTime}.\n\nPlease ensure your belongings are packed. The system will automatically check you out at the scheduled time.\n\nThank you for choosing Tasty Suites! We hope you had a wonderful stay. ⭐`;

  if (twilioClient) {
    try {
      const message = await twilioClient.messages.create({
        from: `whatsapp:${twilioPhone}`,
        to: `whatsapp:${formattedPhone}`,
        body: messageBody,
      });
      console.log(`WhatsApp checkout reminder dispatched to ${formattedPhone} (SID: ${message.sid})`);
      return { success: true, sid: message.sid, mock: false };
    } catch (error) {
      console.error(`Twilio Error. Dispatched SMS fell back to system logger:`, error.message);
      printMockWhatsApp(formattedPhone, messageBody);
      return { success: true, mock: true, error: error.message };
    }
  } else {
    printMockWhatsApp(formattedPhone, messageBody);
    return { success: true, mock: true };
  }
};

module.exports = {
  sendWhatsAppBill,
  sendWhatsAppCheckoutReminder,
};
