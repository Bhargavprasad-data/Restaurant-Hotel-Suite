const nodemailer = require('nodemailer');
const https = require('https');
require('dotenv').config();

// Create nodemailer transporter if credentials exist, otherwise default to console logging
let transporter = null;

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || '"Tasty Bites & Suites" <noreply@tastybites.com>';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || '"Tasty Suites" <onboarding@resend.dev>';

const emailJsServiceId = process.env.EMAILJS_SERVICE_ID;
const emailJsTemplateId = process.env.EMAILJS_TEMPLATE_ID;
const emailJsPublicKey = process.env.EMAILJS_PUBLIC_KEY;
const emailJsPrivateKey = process.env.EMAILJS_PRIVATE_KEY;

const isEmailJsConfigured = !!(emailJsServiceId && emailJsTemplateId && emailJsPublicKey && emailJsPrivateKey);

if (isEmailJsConfigured) {
  console.log('✉️  EmailJS Service API configured successfully.');
} else if (resendApiKey) {
  console.log('✉️  Resend Email Service API configured successfully.');
} else if (smtpHost && smtpUser && smtpPass) {
  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort == 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    console.log('✉️  Nodemailer SMTP Transporter initialized successfully.');
  } catch (err) {
    console.error('⚠️  Failed to initialize Nodemailer SMTP transporter:', err.message);
  }
} else {
  console.log('ℹ️  SMTP credentials, Resend key, and EmailJS credentials missing in .env. Hotel Email notifications will run in Simulator Mode (logged to console).');
}

// Helper: Send email via EmailJS HTTP API (Port 443, bypassed by Render port blocks)
const sendViaEmailJs = async (to, subject, htmlContent) => {
  const payload = {
    service_id: emailJsServiceId,
    template_id: emailJsTemplateId,
    user_id: emailJsPublicKey,
    accessToken: emailJsPrivateKey,
    template_params: {
      to_email: to,
      subject: subject,
      body_html: htmlContent
    }
  };

  if (typeof fetch === 'function') {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `HTTP error! status: ${response.status}`);
    }
    return text;
  } else {
    return new Promise((resolve, reject) => {
      const reqData = JSON.stringify(payload);
      const req = https.request({
        hostname: 'api.emailjs.com',
        path: '/api/v1.0/email/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(reqData)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(body || `HTTP error! status: ${res.statusCode}`));
          }
        });
      });
      req.on('error', reject);
      req.write(reqData);
      req.end();
    });
  }
};

// Helper: Send email via Resend HTTP API (Port 443, bypassed by Render port blocks)
const sendViaResend = async (to, subject, htmlContent) => {
  const payload = {
    from: resendFrom,
    to: [to],
    subject,
    html: htmlContent
  };

  if (typeof fetch === 'function') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
  } else {
    return new Promise((resolve, reject) => {
      const reqData = JSON.stringify(payload);
      const req = https.request({
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(reqData)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
            } else {
              reject(new Error(data.message || `HTTP error! status: ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${body}`));
          }
        });
      });
      req.on('error', reject);
      req.write(reqData);
      req.end();
    });
  }
};

// Helper: send HTML email or print mock to console
const sendMailHelper = async (to, subject, htmlContent) => {
  if (isEmailJsConfigured) {
    try {
      await sendViaEmailJs(to, subject, htmlContent);
      console.log(`✉️  EmailJS: Email successfully sent to ${to} [Subject: "${subject}"]`);
      return { sent: true, mock: false };
    } catch (error) {
      console.error(`❌ EmailJS send failed. Falling back to logging:`, error.message);
      printMockEmail(to, subject, htmlContent);
      return { sent: true, mock: true, error: error.message };
    }
  }

  if (resendApiKey) {
    try {
      await sendViaResend(to, subject, htmlContent);
      console.log(`✉️  Resend API: Email successfully sent to ${to} [Subject: "${subject}"]`);
      return { sent: true, mock: false };
    } catch (error) {
      console.error(`❌ Resend API send failed. Falling back to logging:`, error.message);
      printMockEmail(to, subject, htmlContent);
      return { sent: true, mock: true, error: error.message };
    }
  }

  const mailOptions = {
    from: smtpFrom,
    to,
    subject,
    html: htmlContent
  };

  if (transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`✉️  Real SMTP Email successfully sent to ${to} [Subject: "${subject}"]`);
      return { sent: true, mock: false };
    } catch (error) {
      console.error(`❌ SMTP send failed. Falling back to logging:`, error.message);
      printMockEmail(to, subject, htmlContent);
      return { sent: true, mock: true, error: error.message };
    }
  } else {
    printMockEmail(to, subject, htmlContent);
    return { sent: true, mock: true };
  }
};

const printMockEmail = (to, subject, html) => {
  console.log('\n======================================================');
  console.log('✉️   SIMULATED EMAIL DISPATCHED');
  console.log(`👤  To: ${to}`);
  console.log(`🏷️   Subject: ${subject}`);
  console.log('------------------------------------------------------');
  // Strip tags for console readability
  const text = html
    .replace(/<style([\s\S]*?)<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  console.log(text);
  console.log('======================================================\n');
};

/* ── Professional HTML Templates ── */

const baseTemplate = (title, body) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7fafc; color: #2d3748; margin: 0; padding: 20px; }
    .container { max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3a8a, #0d9488); padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.05em; }
    .header p { margin: 5px 0 0 0; font-size: 12px; font-weight: 600; opacity: 0.8; text-transform: uppercase; }
    .content { padding: 40px 30px; line-height: 1.6; }
    .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #edf2f7; }
    .btn { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #1e3a8a, #0d9488); color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px; margin-top: 20px; box-shadow: 0 4px 10px rgba(13, 148, 136, 0.2); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TASTY SUITES</h1>
      <p>Luxury Hotel & Premium Dining</p>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; color: #1e3a8a; font-size: 20px;">${title}</h2>
      ${body}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Tasty Bites & Suites. All rights reserved.</p>
      <p>123 Luxury Avenue, Paradise Valley, PV 90210</p>
    </div>
  </div>
</body>
</html>
`;

const sendOtpEmail = async (email, otp) => {
  const title = "Verify Your Account";
  const body = `
    <p>Thank you for choosing Tasty Suites! We are thrilled to welcome you to our resort reservation portal.</p>
    <p>Please use the following 6-digit One-Time Password (OTP) to complete your registration. This code is valid for <strong>5 minutes</strong>.</p>
    <div style="background-color: #f0fdfa; border: 1px solid #5eead4; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: 900; letter-spacing: 0.2em; color: #0d9488;">${otp}</span>
    </div>
    <p>If you did not initiate this registration request, you can safely ignore this email.</p>
  `;
  return await sendMailHelper(email, "🔑 OTP Authentication - Tasty Suites", baseTemplate(title, body));
};

const sendBookingConfirmation = async (email, booking) => {
  const title = "Booking Confirmed! 🎉";
  const body = `
    <p>Dear ${booking.customerName},</p>
    <p>We are delighted to confirm your upcoming stay at Tasty Suites! Your reservation is officially secured.</p>
    
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; background-color: #f8fafc; margin: 25px 0;">
      <h3 style="margin-top: 0; color: #1e3a8a; border-b: 1px solid #edf2f7; padding-bottom: 10px;">Booking Invoice Summary</h3>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #718096;"><strong>Booking Ref:</strong></td>
          <td style="padding: 6px 0; text-align: right; font-mono: true;">${booking.id.substring(0, 13).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #718096;"><strong>Room Type:</strong></td>
          <td style="padding: 6px 0; text-align: right; text-transform: capitalize;">${booking.roomType} (Room ${booking.roomNumber})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #718096;"><strong>Check In Date:</strong></td>
          <td style="padding: 6px 0; text-align: right;">${booking.checkIn}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #718096;"><strong>Check Out Date:</strong></td>
          <td style="padding: 6px 0; text-align: right;">${booking.checkOut}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #718096;"><strong>Payment Status:</strong></td>
          <td style="padding: 6px 0; text-align: right; color: #10b981; font-weight: bold;">PAID</td>
        </tr>
        <tr style="border-top: 1px dashed #cbd5e1;">
          <td style="padding: 12px 0 0 0; font-size: 15px;"><strong>Grand Total Billed:</strong></td>
          <td style="padding: 12px 0 0 0; text-align: right; font-size: 16px; font-weight: 900; color: #0d9488;">₹${parseFloat(booking.totalPrice).toFixed(2)}</td>
        </tr>
      </table>
    </div>
    
    <p>Please keep this receipt as a digital entry pass at our front desk upon check-in. We look forward to hosting you!</p>
  `;
  return await sendMailHelper(email, "🛎️ Booking Confirmation - Tasty Suites", baseTemplate(title, body));
};

const sendBookingCancellation = async (email, booking) => {
  const title = "Booking Cancelled ℹ️";
  const body = `
    <p>Dear ${booking.customerName},</p>
    <p>Your reservation at Tasty Suites has been cancelled successfully as requested.</p>
    
    <div style="border: 1px solid #fecaca; border-radius: 12px; padding: 25px; background-color: #fef2f2; margin: 25px 0;">
      <h3 style="margin-top: 0; color: #991b1b;">Reservation Details</h3>
      <p style="font-size: 13px; margin: 5px 0;"><strong>Booking Ref:</strong> ${booking.id.substring(0, 13).toUpperCase()}</p>
      <p style="font-size: 13px; margin: 5px 0;"><strong>Room Number:</strong> ${booking.roomNumber}</p>
      <p style="font-size: 13px; margin: 5px 0;"><strong>Refund Status:</strong> If eligible under our policy, refunds are processed within 3-5 business days.</p>
    </div>
    <p>We hope to serve you again in the future under better circumstances.</p>
  `;
  return await sendMailHelper(email, "🚫 Booking Cancellation - Tasty Suites", baseTemplate(title, body));
};

const sendPasswordReset = async (email, resetUrl) => {
  const title = "Reset Your Password";
  const body = `
    <p>We received a request to reset the password for your reservation account at Tasty Suites.</p>
    <p>Please click the button below to establish a new password. This link is valid for <strong>15 minutes</strong>.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" class="btn" style="color: white;">Reset Password</a>
    </div>
    <p>If you did not make this request, you can safely ignore this email; your credentials remain secure.</p>
  `;
  return await sendMailHelper(email, "🔒 Password Reset Request - Tasty Suites", baseTemplate(title, body));
};

const sendCheckoutReminder = async (email, booking) => {
  const title = "Your Stay Ends in 5 Minutes 🛎️";
  const body = `
    <p>Dear ${booking.customerName},</p>
    <p>This is a friendly reminder that your stay in Room <strong>${booking.roomNumber}</strong> (${booking.roomType}) ends in exactly 5 minutes.</p>
    <p>Please prepare for express checkout. Your room will automatically transition to checked-out status and become available once your stay time expires.</p>
    <p style="margin-top: 20px;">We hope you had a wonderful stay at Tasty Suites! We look forward to welcoming you back.</p>
  `;
  return await sendMailHelper(email, "⏰ Stay Ending Soon - Tasty Suites", baseTemplate(title, body));
};

const sendContactQuery = async (queryDetails) => {
  const title = `New Support Query: ${queryDetails.subject}`;
  const body = `
    <p>You have received a new contact / support query from your website:</p>
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background-color: #f8fafc; margin: 20px 0; color: #2d3748;">
      <p style="margin: 5px 0;"><strong>Name:</strong> ${queryDetails.name}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${queryDetails.email}</p>
      <p style="margin: 5px 0;"><strong>Subject:</strong> ${queryDetails.subject}</p>
      <p style="margin: 15px 0 5px 0;"><strong>Message:</strong></p>
      <p style="margin: 0; white-space: pre-wrap; font-style: italic; background-color: #f1f5f9; padding: 12px; border-radius: 8px;">${queryDetails.message}</p>
    </div>
  `;
  return await sendMailHelper(process.env.SMTP_USER || 'admin@tastysuites.com', `📞 Support Query: ${queryDetails.subject}`, baseTemplate(title, body));
};

module.exports = {
  sendOtpEmail,
  sendBookingConfirmation,
  sendBookingCancellation,
  sendPasswordReset,
  sendCheckoutReminder,
  sendContactQuery,
};
