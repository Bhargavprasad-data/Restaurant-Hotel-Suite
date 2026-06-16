const db = require('../config/db');

const getStats = async (req, res) => {
  try {
    // 1. Total rooms
    const roomsCountResult = await db.query('SELECT COUNT(*) FROM rooms');
    const totalRooms = parseInt(roomsCountResult.rows[0].count);

    // 2. Active Bookings count
    const activeBookingsResult = await db.query(
      `SELECT COUNT(*) FROM bookings WHERE booking_status IN ('Pending', 'Confirmed', 'Checked In')`
    );
    const activeBookings = parseInt(activeBookingsResult.rows[0].count);

    // 3. Occupied rooms right now (status Checked In)
    const occupiedRoomsResult = await db.query(
      `SELECT COUNT(*) FROM bookings WHERE booking_status = 'Checked In'`
    );
    const occupiedRooms = parseInt(occupiedRoomsResult.rows[0].count);
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(0) : 0;

    // 4. Total revenue earned
    const revenueResult = await db.query(
      `SELECT SUM(total_price) FROM bookings WHERE payment_status = 'Paid'`
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].sum || 0);

    // 5. Total customers registered
    const customersResult = await db.query(
      `SELECT COUNT(*) FROM users WHERE role = 'customer'`
    );
    const totalCustomers = parseInt(customersResult.rows[0].count);

    // 6. Recent bookings
    const recentBookingsResult = await db.query(
      `SELECT b.*, r.room_number, r.room_type, u.name as customer_name
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC LIMIT 5`
    );

    res.json({
      kpis: {
        totalRooms,
        activeBookings,
        occupiedRooms,
        occupancyRate: `${occupancyRate}%`,
        totalRevenue,
        totalCustomers
      },
      recentBookings: recentBookingsResult.rows
    });

  } catch (error) {
    console.error('Fetch Stats Error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve administrative statistics.' });
  }
};

const getUsers = async (req, res) => {
  try {
    const usersResult = await db.query(
      `SELECT id, name, email, phone_number, is_verified, role, created_at 
       FROM users 
       WHERE role = 'customer' 
       ORDER BY created_at DESC`
    );
    res.json(usersResult.rows);
  } catch (error) {
    console.error('Fetch Users Error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve guest profiles.' });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone_number, is_verified } = req.body;

  try {
    const userCheck = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Guest profile not found.' });
    }

    const current = userCheck.rows[0];
    const newName = name || current.name;
    const newEmail = email || current.email;
    const newPhone = phone_number !== undefined ? phone_number : current.phone_number;
    const newVerified = is_verified !== undefined ? is_verified : current.is_verified;

    const updateResult = await db.query(
      `UPDATE users 
       SET name = $1, email = $2, phone_number = $3, is_verified = $4
       WHERE id = $5 RETURNING id, name, email, phone_number, is_verified, role, created_at`,
      [newName, newEmail, newPhone, newVerified, id]
    );

    const io = req.app.get('io');
    if (io) {
      io.to('hotel').emit('user:updated', { action: 'update', user: updateResult.rows[0], sender_id: req.user?.id });
    }

    res.json({
      message: 'Guest profile updated successfully!',
      user: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Update User Error:', error.message);
    res.status(500).json({ error: 'Failed to update guest profile.' });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const userCheck = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Guest profile not found.' });
    }

    const user = userCheck.rows[0];

    // Restrict deletion to unverified users only
    if (user.is_verified) {
      return res.status(400).json({ error: 'Only unverified guest accounts can be deleted.' });
    }

    // Delete associated OTP records first, then delete the user
    await db.query('DELETE FROM otp_verifications WHERE email = $1', [user.email]);
    await db.query('DELETE FROM users WHERE id = $1', [id]);

    const io = req.app.get('io');
    if (io) {
      io.to('hotel').emit('user:updated', { action: 'delete', user_id: id, sender_id: req.user?.id });
    }

    res.json({
      message: 'Unverified guest profile deleted successfully!',
      user_id: id
    });

  } catch (error) {
    console.error('Delete User Error:', error.message);
    res.status(500).json({ error: 'Failed to delete guest profile.' });
  }
};

module.exports = {
  getStats,
  getUsers,
  updateUser,
  deleteUser,
};
