const db = require('../config/db');
const emailService = require('../services/hotelEmailService');

const placeBooking = async (req, res) => {
  const { room_id, check_in_date, check_out_date } = req.body;
  const user_id = req.user.id;

  if (!room_id || !check_in_date || !check_out_date) {
    return res.status(400).json({ error: 'Please provide room, check-in date, and check-out date.' });
  }

  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);

  if (checkIn >= checkOut) {
    return res.status(400).json({ error: 'Check-out date must be strictly after the check-in date.' });
  }

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (check_in_date < todayStr) {
    return res.status(400).json({ error: 'Check-in date cannot be in the past.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch Room particulars (with row-level locking to prevent concurrent booking duplicates)
    const roomResult = await client.query('SELECT * FROM rooms WHERE id = $1 FOR UPDATE', [room_id]);
    if (roomResult.rows.length === 0) {
      throw new Error('Room listing not found.');
    }
    const room = roomResult.rows[0];

    if (room.availability_status === 'maintenance') {
      throw new Error('Selected room is currently undergoing scheduled maintenance.');
    }

    // Check if the user already has an identical pending booking to prevent duplicates
    const existingPending = await client.query(
      `SELECT * FROM bookings 
       WHERE user_id = $1 
         AND room_id = $2 
         AND check_in_date::date = $3::date 
         AND check_out_date::date = $4::date 
         AND booking_status = 'Pending'`,
      [user_id, room_id, check_in_date, check_out_date]
    );

    if (existingPending.rows.length > 0) {
      const booking = existingPending.rows[0];
      await client.query('COMMIT');
      
      const userResult = await db.query('SELECT name, email, phone_number FROM users WHERE id = $1', [user_id]);
      const customer = userResult.rows[0];
      const responseBooking = {
        ...booking,
        room_number: room.room_number,
        room_type: room.room_type,
        price_per_day: room.price,
        customer_name: customer ? customer.name : '',
        customer_email: customer ? customer.email : '',
        customer_phone: customer ? customer.phone_number : ''
      };
      
      return res.status(200).json({
        message: 'Reusing existing draft booking.',
        booking: responseBooking
      });
    }

    // 2. Overlap Checking (Strict block on active reservations)
    const overlapResult = await client.query(
      `SELECT * FROM bookings 
       WHERE room_id = $1 
         AND booking_status IN ('Confirmed', 'Checked In')`,
      [room_id]
    );

    if (overlapResult.rows.length > 0) {
      throw new Error('This room is already reserved by another customer and cannot be booked until they check out.');
    }

    // 3. Price Calculations (Duration in days * price)
    const diffTime = Math.abs(checkOut - checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalPrice = diffDays * parseFloat(room.price);

    // 4. Create Booking (Default to 'Pending' booking status, 'Pending' payment status)
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const checkInTimestamp = `${check_in_date} ${timeStr}`;
    const checkOutTimestamp = `${check_out_date} ${timeStr}`;

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, room_id, check_in_date, check_out_date, total_price, booking_status, payment_status)
       VALUES ($1, $2, $3, $4, $5, 'Pending', 'Pending') RETURNING *`,
      [user_id, room_id, checkInTimestamp, checkOutTimestamp, totalPrice]
    );
    const booking = bookingResult.rows[0];

    await client.query('COMMIT');

    const userResult = await db.query('SELECT name, email, phone_number FROM users WHERE id = $1', [user_id]);
    const customer = userResult.rows[0];
    const responseBooking = {
      ...booking,
      room_number: room.room_number,
      room_type: room.room_type,
      price_per_day: room.price,
      customer_name: customer ? customer.name : '',
      customer_email: customer ? customer.email : '',
      customer_phone: customer ? customer.phone_number : ''
    };

    const io = req.app.get('io');
    if (io) {
      io.to('hotel').emit('booking:updated', {
        action: 'create',
        booking: responseBooking,
        sender_id: req.user?.id
      });
    }

    res.status(201).json({
      message: 'Booking created successfully! Complete your payment to confirm.',
      booking: responseBooking
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create Booking Error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to place booking.' });
  } finally {
    client.release();
  }
};

const autoCheckoutExpiredBookings = async (io) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch Checked In bookings whose checkout time has passed
    const expiredResult = await client.query(
      `SELECT b.*, r.room_number, r.room_type, u.name as customer_name, u.email as customer_email, u.phone_number as customer_phone
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN users u ON b.user_id = u.id
       WHERE b.booking_status = 'Checked In' 
         AND b.check_out_date <= CURRENT_TIMESTAMP`
    );

    if (expiredResult.rows.length > 0) {
      const expiredBookings = expiredResult.rows;
      const expiredIds = expiredBookings.map(b => b.id);

      // 2. Update booking statuses to 'Checked Out'
      await client.query(
        `UPDATE bookings 
         SET booking_status = 'Checked Out', checkout_reminder_sent = TRUE, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ANY($1::uuid[])`,
        [expiredIds]
      );

      // 3. Mark rooms as 'available'
      const roomIds = expiredBookings.map(b => b.room_id);
      await client.query(
        `UPDATE rooms 
         SET availability_status = 'available' 
         WHERE id = ANY($1::uuid[]) 
           AND availability_status != 'maintenance'`,
        [roomIds]
      );

      await client.query('COMMIT');

      // 4. Broadcast live Socket.io events
      if (io) {
        expiredBookings.forEach(b => {
          const responseBooking = {
            ...b,
            booking_status: 'Checked Out',
            payment_status: 'Paid',
            room_number: b.room_number,
            room_type: b.room_type,
            customer_name: b.customer_name,
            customer_email: b.customer_email,
            customer_phone: b.customer_phone
          };
          
          io.to('hotel').emit('booking:updated', {
            action: 'status_change',
            booking: responseBooking,
            sender_id: 'system'
          });

          io.to('hotel').emit('room:updated', {
            action: 'update',
            room: { id: b.room_id, availability_status: 'available' },
            sender_id: 'system'
          });
        });
      }
      console.log(`[Auto-Checkout] Successfully checked out ${expiredBookings.length} expired stays.`);
    } else {
      await client.query('COMMIT');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Auto-Checkout] Error:', error.message);
  } finally {
    client.release();
  }
};

const getMyBookings = async (req, res) => {
  const user_id = req.user.id;

  try {
    const io = req.app.get('io');
    await autoCheckoutExpiredBookings(io);

    const bookingsResult = await db.query(
      `SELECT b.*, r.room_number, r.room_type, r.image_url, hp.transaction_id, hp.payment_method
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       LEFT JOIN hotel_payments hp ON b.id = hp.booking_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [user_id]
    );

    res.json(bookingsResult.rows);
  } catch (error) {
    console.error('Fetch My Bookings Error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve booking transactions.' });
  }
};

const cancelBooking = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  const role = req.user.role;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch booking details
    const bookingResult = await client.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found.');
    }
    const booking = bookingResult.rows[0];

    // Authorization check: only room-holders or admins can cancel bookings
    if (role !== 'admin' && booking.user_id !== user_id) {
      throw new Error('Permission denied. You cannot cancel another user\'s reservation.');
    }

    if (booking.booking_status === 'Cancelled') {
      throw new Error('Booking is already cancelled.');
    }

    if (booking.booking_status === 'Checked In' || booking.booking_status === 'Checked Out') {
      throw new Error('Cannot cancel active or completed stays.');
    }

    // 2. Update booking status
    const updateResult = await client.query(
      `UPDATE bookings 
       SET booking_status = 'Cancelled', payment_status = CASE WHEN payment_status = 'Paid' THEN 'Refunded' ELSE payment_status END 
       WHERE id = $1 RETURNING *`,
      [id]
    );

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
      [booking.room_id]
    );

    // Fetch details to send email and notify WebSocket
    const roomResult = await client.query('SELECT * FROM rooms WHERE id = $1', [booking.room_id]);
    const room = roomResult.rows[0];

    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [booking.user_id]);
    const customer = userResult.rows[0];

    await client.query('COMMIT');

    const updatedBooking = {
      ...updateResult.rows[0],
      room_number: room.room_number,
      room_type: room.room_type,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone_number
    };

    const io = req.app.get('io');
    if (io) {
      io.to('hotel').emit('booking:updated', {
        action: 'cancel',
        booking: updatedBooking,
        sender_id: req.user?.id
      });
      io.to('hotel').emit('room:updated', {
        action: 'update',
        room: { id: booking.room_id, availability_status: room ? room.availability_status : 'available' },
        sender_id: req.user?.id
      });
    }

    // 3. Dispatch Cancellation Email
    await emailService.sendBookingCancellation(customer.email, {
      id: booking.id,
      customerName: customer.name,
      roomNumber: room.room_number
    });

    res.json({
      message: 'Booking cancelled successfully! A confirmation notice was emailed.',
      booking: updatedBooking
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel Booking Error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to cancel booking.' });
  } finally {
    client.release();
  }
};

const manageAllBookings = async (req, res) => {
  try {
    const io = req.app.get('io');
    await autoCheckoutExpiredBookings(io);

    const bookingsResult = await db.query(
      `SELECT b.*, r.room_number, r.room_type, u.name as customer_name, u.email as customer_email, u.phone_number as customer_phone
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC`
    );

    res.json(bookingsResult.rows);
  } catch (error) {
    console.error('Manage All Bookings Error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve administrative booking lists.' });
  }
};

const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { booking_status } = req.body; // Pending, Confirmed, Cancelled, Checked In, Checked Out

  if (!['Pending', 'Confirmed', 'Cancelled', 'Checked In', 'Checked Out'].includes(booking_status)) {
    return res.status(400).json({ error: 'Invalid booking status transition.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found.');
    }
    const booking = bookingResult.rows[0];

    // Modify status (and auto-mark payment as Paid when manually Confirmed)
    let checkInTimestamp = booking.check_in_date;
    let checkOutTimestamp = booking.check_out_date;

    if (booking_status === 'Checked In') {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      checkInTimestamp = `${yyyy}-${mm}-${dd} ${timeStr}`;

      // Calculate number of days from original booking dates
      const origCheckIn = new Date(booking.check_in_date);
      const origCheckOut = new Date(booking.check_out_date);
      // Strip time to just calculate days difference accurately
      origCheckIn.setHours(0, 0, 0, 0);
      origCheckOut.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(origCheckOut - origCheckIn);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      // Add diffDays to the current check-in time
      const cod = new Date(now.getTime() + diffDays * 24 * 60 * 60 * 1000);
      const coY = cod.getFullYear();
      const coM = String(cod.getMonth() + 1).padStart(2, '0');
      const coD = String(cod.getDate()).padStart(2, '0');
      
      checkOutTimestamp = `${coY}-${coM}-${coD} ${timeStr}`;
    }

    const updateResult = await client.query(
      `UPDATE bookings 
       SET booking_status = CAST($1 AS VARCHAR), 
           payment_status = CASE WHEN CAST($2 AS VARCHAR) = 'Confirmed' THEN 'Paid' ELSE payment_status END, 
           check_in_date = $3,
           check_out_date = $4,
           checkout_reminder_sent = CASE WHEN CAST($1 AS VARCHAR) = 'Checked Out' THEN TRUE ELSE checkout_reminder_sent END,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 RETURNING *`,
      [booking_status, booking_status, checkInTimestamp, checkOutTimestamp, id]
    );

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
      [booking.room_id]
    );

    const updatedBooking = updateResult.rows[0];
    const roomResult = await client.query('SELECT room_number, room_type, availability_status FROM rooms WHERE id = $1', [updatedBooking.room_id]);
    const room = roomResult.rows[0];
    const userResult = await client.query('SELECT name, email, phone_number FROM users WHERE id = $1', [updatedBooking.user_id]);
    const customer = userResult.rows[0];

    await client.query('COMMIT');

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
        action: 'status_change',
        booking: responseBooking,
        sender_id: req.user?.id
      });
      
      // Also notify room listing pages of capacity/occupancy availability change
      io.to('hotel').emit('room:updated', {
        action: 'update',
        room: { id: updatedBooking.room_id, availability_status: room ? room.availability_status : 'available' },
        sender_id: req.user?.id
      });
    }

    res.json({
      message: 'Booking status updated successfully!',
      booking: responseBooking
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update Booking Status Error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to update status.' });
  } finally {
    client.release();
  }
};

const updateBookingDetails = async (req, res) => {
  const { id } = req.params;
  const { check_in_date, check_out_date } = req.body;
  const user_id = req.user.id;
  const role = req.user.role;

  if (!check_in_date || !check_out_date) {
    return res.status(400).json({ error: 'Please provide check-in and check-out dates.' });
  }

  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);

  if (checkIn >= checkOut) {
    return res.status(400).json({ error: 'Check-out date must be strictly after the check-in date.' });
  }

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (check_in_date < todayStr) {
    return res.status(400).json({ error: 'Check-in date cannot be in the past.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch booking details
    const bookingResult = await client.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found.');
    }
    const booking = bookingResult.rows[0];

    // Authorization: only the user who made the booking or admin can update it
    if (role !== 'admin' && booking.user_id !== user_id) {
      throw new Error('Permission denied.');
    }

    if (booking.booking_status !== 'Pending') {
      throw new Error('Only Pending bookings can be edited.');
    }

    // 2. Fetch room details to calculate pricing
    const roomResult = await client.query('SELECT * FROM rooms WHERE id = $1', [booking.room_id]);
    const room = roomResult.rows[0];

    // 3. Overlap checking (excluding this booking itself)
    const overlapResult = await client.query(
      `SELECT * FROM bookings 
       WHERE room_id = $1 
         AND booking_status IN ('Confirmed', 'Checked In')
         AND id != $2`,
      [booking.room_id, id]
    );

    if (overlapResult.rows.length > 0) {
      throw new Error('This room is already reserved for the selected dates.');
    }

    // 4. Calculate new price
    const diffTime = Math.abs(checkOut - checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalPrice = diffDays * parseFloat(room.price);

    // 5. Update booking
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const checkInTimestamp = `${check_in_date} ${timeStr}`;
    const checkOutTimestamp = `${check_out_date} ${timeStr}`;

    const updateResult = await client.query(
      `UPDATE bookings 
       SET check_in_date = $1, check_out_date = $2, total_price = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 RETURNING *`,
      [checkInTimestamp, checkOutTimestamp, totalPrice, id]
    );
    const updatedBooking = updateResult.rows[0];

    await client.query('COMMIT');

    const responseBooking = {
      ...updatedBooking,
      room_number: room.room_number,
      room_type: room.room_type,
      price_per_day: room.price
    };

    const io = req.app.get('io');
    if (io) {
      io.to('hotel').emit('booking:updated', {
        action: 'status_change',
        booking: responseBooking,
        sender_id: req.user?.id
      });
    }

    res.json({
      message: 'Booking details updated successfully!',
      booking: responseBooking
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update Booking Details Error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to update booking details.' });
  } finally {
    client.release();
  }
};

const deleteBooking = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  const role = req.user.role;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch booking details
    const bookingResult = await client.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found.');
    }
    const booking = bookingResult.rows[0];

    // Authorization: only the user who made the booking or admin can delete it
    if (role !== 'admin' && booking.user_id !== user_id) {
      throw new Error('Permission denied.');
    }

    // Only Cancelled or Pending bookings can be deleted
    if (!['Pending', 'Cancelled'].includes(booking.booking_status)) {
      throw new Error('Only Pending or Cancelled bookings can be deleted.');
    }

    // 2. Delete payments first if they exist
    await client.query('DELETE FROM hotel_payments WHERE booking_id = $1', [id]);

    // 3. Delete booking
    await client.query('DELETE FROM bookings WHERE id = $1', [id]);

    // 4. Update room status robustly just in case
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
      [booking.room_id]
    );

    // Fetch the updated room status to notify
    const roomResult = await client.query('SELECT availability_status FROM rooms WHERE id = $1', [booking.room_id]);
    const updatedStatus = roomResult.rows[0]?.availability_status || 'available';

    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.to('hotel').emit('booking:updated', {
        action: 'delete',
        booking: { id, room_id: booking.room_id },
        sender_id: req.user?.id
      });
      io.to('hotel').emit('room:updated', {
        action: 'update',
        room: { id: booking.room_id, availability_status: updatedStatus },
        sender_id: req.user?.id
      });
    }

    res.json({ message: 'Booking deleted successfully!' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete Booking Error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to delete booking.' });
  } finally {
    client.release();
  }
};

const updateBookingPaymentStatus = async (req, res) => {
  const { id } = req.params;
  const { payment_status } = req.body; // Pending, Paid, Refunded

  if (!['Pending', 'Paid', 'Refunded'].includes(payment_status)) {
    return res.status(400).json({ error: 'Invalid payment status.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found.');
    }
    const booking = bookingResult.rows[0];

    const updateResult = await client.query(
      `UPDATE bookings 
       SET payment_status = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING *`,
      [payment_status, id]
    );

    const updatedBooking = updateResult.rows[0];
    const roomResult = await client.query('SELECT room_number, room_type, availability_status FROM rooms WHERE id = $1', [updatedBooking.room_id]);
    const room = roomResult.rows[0];
    const userResult = await client.query('SELECT name, email, phone_number FROM users WHERE id = $1', [updatedBooking.user_id]);
    const customer = userResult.rows[0];

    await client.query('COMMIT');

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
        action: 'status_change',
        booking: responseBooking,
        sender_id: req.user?.id
      });
    }

    res.json({
      message: 'Payment status updated successfully!',
      booking: responseBooking
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update Booking Payment Error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to update payment status.' });
  } finally {
    client.release();
  }
};

module.exports = {
  placeBooking,
  getMyBookings,
  cancelBooking,
  manageAllBookings,
  updateBookingStatus,
  updateBookingDetails,
  deleteBooking,
  autoCheckoutExpiredBookings,
  updateBookingPaymentStatus,
};
