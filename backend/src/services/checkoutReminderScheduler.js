const db = require('../config/db');
const emailService = require('./hotelEmailService');
const twilioService = require('./twilioService');
const { autoCheckoutExpiredBookings } = require('../controllers/hotelBookingController');

const startCheckoutScheduler = (io) => {
  console.log('⏰ Checkout Background Scheduler initialized.');

  setInterval(async () => {
    try {
      // 1. First, automatically process and check out expired bookings
      await autoCheckoutExpiredBookings(io);

      // 2. Fetch active 'Checked In' stays that end in the next 5 minutes and haven't received a reminder
      const upcomingCheckouts = await db.query(
        `SELECT b.*, r.room_number, r.room_type, u.name as customer_name, u.email as customer_email, u.phone_number as customer_phone
         FROM bookings b
         JOIN rooms r ON b.room_id = r.id
         JOIN users u ON b.user_id = u.id
         WHERE b.booking_status = 'Checked In'
           AND b.checkout_reminder_sent = FALSE
           AND b.check_out_date <= CURRENT_TIMESTAMP + INTERVAL '5 minutes'
           AND b.check_out_date > CURRENT_TIMESTAMP`
      );

      for (const booking of upcomingCheckouts.rows) {
        try {
          console.log(`✉️ Sending 5-min checkout reminder email to ${booking.customer_email} for Room ${booking.room_number}...`);
          
          await emailService.sendCheckoutReminder(booking.customer_email, {
            id: booking.id,
            customerName: booking.customer_name,
            roomNumber: booking.room_number,
            roomType: booking.room_type,
            checkOutTime: booking.check_out_date
          });

          if (booking.customer_phone) {
            try {
              console.log(`✉️ Sending 5-min checkout reminder WhatsApp to ${booking.customer_phone} for Room ${booking.room_number}...`);
              await twilioService.sendWhatsAppCheckoutReminder(
                booking.customer_phone,
                booking.customer_name,
                booking.room_number,
                booking.check_out_date
              );
            } catch (smsErr) {
              console.error(`❌ Failed to process checkout WhatsApp for Booking ID ${booking.id}:`, smsErr.message);
            }
          }

          // Update column status so we never send duplicate notifications
          await db.query(
            `UPDATE bookings SET checkout_reminder_sent = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [booking.id]
          );

          console.log(`✅ Checkout reminder sent & marked in DB for Booking ID: ${booking.id}`);
        } catch (mailErr) {
          console.error(`❌ Failed to process checkout notification for Booking ID ${booking.id}:`, mailErr.message);
        }
      }
    } catch (err) {
      console.error('❌ [Checkout-Scheduler] background error:', err.message);
    }
  }, 30000); // Check every 30 seconds
};

module.exports = { startCheckoutScheduler };
