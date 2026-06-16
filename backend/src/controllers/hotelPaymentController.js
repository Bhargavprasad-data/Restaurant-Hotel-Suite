const db = require('../config/db');
const emailService = require('../services/hotelEmailService');

const createPaymentOrder = async (req, res) => {
  const { booking_id } = req.body;

  if (!booking_id) {
    return res.status(400).json({ error: 'Please provide booking ID.' });
  }

  try {
    const bookingResult = await db.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    const booking = bookingResult.rows[0];

    // Simulate Payment Gateway Order Creation
    const mockRazorpayOrderId = `order_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    res.json({
      message: 'Razorpay order created successfully (Simulated mode).',
      order_id: mockRazorpayOrderId,
      amount: parseFloat(booking.total_price) * 100, // in paisa
      currency: 'INR',
      booking_id: booking.id
    });

  } catch (error) {
    console.error('Create Payment Order Error:', error.message);
    res.status(500).json({ error: 'Failed to initiate checkout.' });
  }
};

const verifyPayment = async (req, res) => {
  const { booking_id, razorpay_payment_id, razorpay_order_id, method = 'UPI' } = req.body;

  if (!booking_id || !razorpay_payment_id) {
    return res.status(400).json({ error: 'Please provide booking ID and transaction details.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch booking (with row-level locking to serialize payment updates)
    const bookingResult = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [booking_id]);
    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found.');
    }
    const booking = bookingResult.rows[0];

    if (booking.booking_status === 'Cancelled') {
      throw new Error('Cannot pay for a cancelled booking.');
    }

    // 1.5 Overlap Checking (Strict block on active reservations)
    const overlapResult = await client.query(
      `SELECT * FROM bookings 
       WHERE room_id = $1 
         AND booking_status IN ('Confirmed', 'Checked In')
         AND id != $2`,
      [booking.room_id, booking_id]
    );

    if (overlapResult.rows.length > 0) {
      throw new Error('This room has already been confirmed/booked by another guest. Your payment cannot be processed.');
    }

    const isOnline = ['UPI', 'Card', 'NetBanking'].includes(method);
    const paymentStatusVal = isOnline ? 'successful' : 'Pending';
    const bookingPaymentStatusVal = isOnline ? 'Paid' : 'Pending';

    // 2. Insert Payment Record
    const paymentResult = await client.query(
      `INSERT INTO hotel_payments (booking_id, payment_method, payment_status, transaction_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [booking_id, method, paymentStatusVal, razorpay_payment_id]
    );

    // 3. Confirm Booking & Update Payment Status
    const updateBookingResult = await client.query(
      `UPDATE bookings 
       SET booking_status = 'Confirmed', payment_status = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [booking_id, bookingPaymentStatusVal]
    );
    const updatedBooking = updateBookingResult.rows[0];

    // Update room availability status based on active bookings
    await client.query(
      `UPDATE rooms 
       SET availability_status = CASE 
         WHEN availability_status = 'maintenance' THEN 'maintenance'
         WHEN EXISTS (
           SELECT 1 FROM bookings 
           WHERE bookings.room_id = rooms.id 
             AND bookings.booking_status IN ('Confirmed', 'Checked In')
         ) THEN 'occupied'
         ELSE 'available'
       END
       WHERE id = $1`,
      [updatedBooking.room_id]
    );

    // Fetch Details to compile rich email invoice and broadcast status
    const roomResult = await client.query('SELECT * FROM rooms WHERE id = $1', [booking.room_id]);
    const room = roomResult.rows[0];

    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [booking.user_id]);
    const customer = userResult.rows[0];

    await client.query('COMMIT');

    // 4. Dispatch Email Invoice Confirmation
    await emailService.sendBookingConfirmation(customer.email, {
      id: updatedBooking.id,
      customerName: customer.name,
      roomNumber: room.room_number,
      roomType: room.room_type,
      checkIn: updatedBooking.check_in_date,
      checkOut: updatedBooking.check_out_date,
      totalPrice: updatedBooking.total_price
    });

    const responseBooking = {
      ...updatedBooking,
      room_number: room ? room.room_number : '',
      room_type: room ? room.room_type : '',
      customer_name: customer ? customer.name : '',
      customer_email: customer ? customer.email : '',
      customer_phone: customer ? customer.phone_number : ''
    };

    const io = req.app.get('io');
    if (io) {
      io.to('hotel').emit('booking:updated', {
        action: 'payment_verified',
        booking: responseBooking,
        sender_id: req.user?.id
      });
      
      // Notify availability status changes since the booking is now Confirmed
      io.to('hotel').emit('room:updated', {
        action: 'update',
        room: { id: updatedBooking.room_id, availability_status: room ? room.availability_status : 'occupied' },
        sender_id: req.user?.id
      });
    }

    res.json({
      message: isOnline ? 'Checkout verification successful! Payment approved.' : 'Checkout successful! Booking confirmed with cash on arrival.',
      booking: responseBooking,
      payment: paymentResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment Verification Error:', error.message);
    res.status(400).json({ error: error.message || 'Payment approval failed.' });
  } finally {
    client.release();
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
};
