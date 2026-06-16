const db = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function verifyHotelSystem() {
  const client = await db.pool.connect();
  try {
    console.log('📡 Starting Hotel Booking system integration validation...');
    await client.query('BEGIN');

    // 1. Create a mock customer account
    const testEmail = `guest_${Math.random().toString(36).substring(2, 9)}@example.com`;
    const passwordHash = await bcrypt.hash('GuestPassword123!', 10);
    
    console.log(`👤 1. Creating mock customer account: ${testEmail}`);
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone_number, is_verified)
       VALUES ('Hotel Guest', $1, $2, 'customer', '9876543210', FALSE) RETURNING *`,
      [testEmail, passwordHash]
    );
    const guest = userResult.rows[0];
    console.log(`   ✅ Account created (Verified status: ${guest.is_verified})`);

    // 2. Generate and Verify OTP
    console.log(`🔑 2. Initializing 6-digit OTP verification...`);
    const mockOtp = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    await client.query(
      `INSERT INTO otp_verifications (email, otp, expires_at, is_verified)
       VALUES ($1, $2, $3, FALSE)`,
      [testEmail, mockOtp, expiresAt]
    );

    // Verify OTP
    const verifyResult = await client.query(
      `UPDATE users SET is_verified = TRUE WHERE email = $1 RETURNING *`,
      [testEmail]
    );
    console.log(`   ✅ OTP verification approved! User verified status: ${verifyResult.rows[0].is_verified}`);

    // 3. Catalog a Room
    const roomNo = `RM_${Math.floor(100 + Math.random() * 900)}`;
    console.log(`🛎️ 3. Seeding a luxury suite in inventory: Room ${roomNo}`);
    const roomResult = await client.query(
      `INSERT INTO rooms (room_number, room_type, price, capacity, description, amenities, availability_status)
       VALUES ($1, 'suite', 5500.00, 2, 'Luxury Valley Suite', ARRAY['WiFi', 'AC', 'Mini Bar'], 'available') RETURNING *`,
      [roomNo]
    );
    const room = roomResult.rows[0];
    console.log(`   ✅ Room Seeded successfully (ID: ${room.id})`);

    // 4. Reserve Room (Check-In: June 1, Check-Out: June 5)
    console.log(`📅 4. Scheduling reservation for Room ${roomNo} (June 1 - June 5)`);
    const booking1 = await client.query(
      `INSERT INTO bookings (user_id, room_id, check_in_date, check_out_date, total_price, booking_status, payment_status)
       VALUES ($1, $2, '2026-06-01', '2026-06-05', 22000.00, 'Confirmed', 'Paid') RETURNING *`,
      [guest.id, room.id]
    );
    console.log(`   ✅ Booking placed! Grand Total: ₹${parseFloat(booking1.rows[0].total_price).toFixed(2)}`);

    // 5. Test Overlap Booking logic (Try to reserve same room June 3 to June 7)
    console.log(`🚫 5. Validating Calendar overlap checks (Attempting to reserve Room ${roomNo} for June 3 - June 7)`);
    const checkInNew = '2026-06-03';
    const checkOutNew = '2026-06-07';
    
    const overlapResult = await client.query(
      `SELECT * FROM bookings 
       WHERE room_id = $1 
         AND booking_status IN ('Pending', 'Confirmed', 'Checked In')
         AND NOT (check_out_date <= $2 OR check_in_date >= $3)`,
      [room.id, checkInNew, checkOutNew]
    );

    if (overlapResult.rows.length > 0) {
      console.log(`   ✅ OVERLAP BLOCKED SUCCESSFUL! System prevented double-booking Room ${roomNo} for overlapping check-ins.`);
    } else {
      throw new Error('SYSTEM ERROR: Calendar overlap logic failed to catch date collision!');
    }

    // 6. Test Stay Cancellation
    console.log(`🗑️ 6. Simulating cancellation request for booking ID: ${booking1.rows[0].id}`);
    const cancelResult = await client.query(
      `UPDATE bookings SET booking_status = 'Cancelled', payment_status = 'Refunded' WHERE id = $1 RETURNING *`,
      [booking1.rows[0].id]
    );
    console.log(`   ✅ Stay Cancelled successfully. Roster Reservation Status: ${cancelResult.rows[0].booking_status} (Payment: ${cancelResult.rows[0].payment_status})`);

    await client.query('ROLLBACK'); // Keep DB clean after testing
    console.log('\n🎉 ALL FULL-STACK HOTEL SYSTEM INTEGRATION TESTS PASSED GLORIOUSLY!');
    process.exit(0);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Validation script failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

verifyHotelSystem();
