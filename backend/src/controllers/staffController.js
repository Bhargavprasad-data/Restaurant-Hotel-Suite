const bcrypt = require('bcryptjs');
const db = require('../config/db');

const getStaff = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role, phone_number, shift_timing, attendance_status, created_at 
       FROM users 
       WHERE role IN ('waiter', 'kitchen')
       ORDER BY role, name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching staff roster:', error);
    res.status(500).json({ error: 'Failed to retrieve staff profiles.' });
  }
};

const createStaff = async (req, res) => {
  const { name, email, password, role, phone_number, shift_timing } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }

  if (!['waiter', 'kitchen'].includes(role)) {
    return res.status(400).json({ error: 'Roster accounts must be assigned to waiter or kitchen roles.' });
  }

  try {
    // Check if email already in database
    const checkEmail = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, phone_number, shift_timing, attendance_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'clocked_out') RETURNING id, name, email, role, phone_number, shift_timing`,
      [name, email.toLowerCase().trim(), passwordHash, role, phone_number || null, shift_timing || '09:00 - 17:00']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error registering employee:', error);
    res.status(500).json({ error: 'Failed to create employee profile.' });
  }
};

const updateStaff = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, phone_number, shift_timing, password } = req.body;

  try {
    const checkUser = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    let query = 'UPDATE users SET ';
    const params = [];
    let count = 1;

    if (name !== undefined) {
      query += `name = $${count}, `;
      params.push(name);
      count++;
    }
    if (email !== undefined) {
      // Check unique constraints
      const emailCheck = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.toLowerCase().trim(), id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use.' });
      }
      query += `email = $${count}, `;
      params.push(email.toLowerCase().trim());
      count++;
    }
    if (role !== undefined) {
      query += `role = $${count}, `;
      params.push(role);
      count++;
    }
    if (phone_number !== undefined) {
      query += `phone_number = $${count}, `;
      params.push(phone_number);
      count++;
    }
    if (shift_timing !== undefined) {
      query += `shift_timing = $${count}, `;
      params.push(shift_timing);
      count++;
    }
    if (password !== undefined && password !== '') {
      const passwordHash = await bcrypt.hash(password, 10);
      query += `password_hash = $${count}, `;
      params.push(passwordHash);
      count++;
    }

    // Remove trailing comma
    query = query.slice(0, -2);
    query += ` WHERE id = $${count} RETURNING id, name, email, role, phone_number, shift_timing`;
    params.push(id);

    const result = await db.query(query, params);
    const updatedStaff = result.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.emit('user-update', updatedStaff);
    }

    res.json(updatedStaff);
  } catch (error) {
    console.error('Error updating staff details:', error);
    res.status(500).json({ error: 'Failed to update employee details.' });
  }
};

const deleteStaff = async (req, res) => {
  const { id } = req.params;

  try {
    const checkUser = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('user-delete', { id: parseInt(id) });
    }

    res.json({ message: 'Staff profile removed successfully.' });
  } catch (error) {
    console.error('Error removing employee:', error);
    res.status(500).json({ error: 'Failed to delete user profile. Make sure there are no references in historical tables.' });
  }
};

// --- Attendance Services ---

const clockIn = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Verify user is clocked out
    const checkUser = await db.query('SELECT attendance_status FROM users WHERE id = $1', [userId]);
    if (checkUser.rows[0].attendance_status === 'clocked_in') {
      return res.status(400).json({ error: 'You are already clocked in.' });
    }

    // 2. Add or update today's attendance record
    const today = new Date().toISOString().split('T')[0];
    await db.query(
      `INSERT INTO attendance_records (user_id, record_date, clock_in, clock_out, hours_worked)
       VALUES ($1, $2, CURRENT_TIMESTAMP, NULL, 0.00)
       ON CONFLICT (user_id, record_date) 
       DO UPDATE SET clock_in = CURRENT_TIMESTAMP, clock_out = NULL, hours_worked = 0.00`,
      [userId, today]
    );

    // 3. Update user status
    await db.query('UPDATE users SET attendance_status = \'clocked_in\' WHERE id = $1', [userId]);

    // Fetch updated user to emit live socket event
    const userResult = await db.query(
      'SELECT id, name, email, role, phone_number, shift_timing, attendance_status FROM users WHERE id = $1',
      [userId]
    );
    const updatedUser = userResult.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.emit('user-update', updatedUser);
      io.emit('attendance:updated', {
        userId: updatedUser.id,
        name: updatedUser.name,
        role: updatedUser.role,
        status: updatedUser.attendance_status
      });
    }
    
    res.json({ message: 'Clocked in successfully. Have a great shift!', user: updatedUser });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ error: 'Attendance registration failed.' });
  }
};

const clockOut = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Verify clocked in
    const checkUser = await db.query('SELECT attendance_status FROM users WHERE id = $1', [userId]);
    if (checkUser.rows[0].attendance_status === 'clocked_out') {
      return res.status(400).json({ error: 'You are not clocked in.' });
    }

    // 2. Fetch the most recent active clock_in session
    const recordResult = await db.query(
      'SELECT id, clock_in FROM attendance_records WHERE user_id = $1 AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1',
      [userId]
    );

    if (recordResult.rows.length === 0) {
      // If we somehow have no open records but user flag says clocked_in, fix the flag
      await db.query('UPDATE users SET attendance_status = \'clocked_out\' WHERE id = $1', [userId]);
      return res.status(400).json({ error: 'No active clock-in session found. Your status has been reset.' });
    }

    const sessionId = recordResult.rows[0].id;
    const clockInTime = new Date(recordResult.rows[0].clock_in);
    const clockOutTime = new Date();
    
    // Calculate elapsed hours
    const diffMs = clockOutTime - clockInTime;
    const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // round to 2 decimals

    // 3. Update attendance logs
    await db.query(
      `UPDATE attendance_records 
       SET clock_out = CURRENT_TIMESTAMP, hours_worked = $1
       WHERE id = $2`,
      [hours, sessionId]
    );

    // 4. Update user flag
    await db.query('UPDATE users SET attendance_status = \'clocked_out\' WHERE id = $1', [userId]);

    // Fetch updated user to emit live socket event
    const userResult = await db.query(
      'SELECT id, name, email, role, phone_number, shift_timing, attendance_status FROM users WHERE id = $1',
      [userId]
    );
    const updatedUser = userResult.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.emit('user-update', updatedUser);
      io.emit('attendance:updated', {
        userId: updatedUser.id,
        name: updatedUser.name,
        role: updatedUser.role,
        status: updatedUser.attendance_status
      });
    }

    res.json({ message: 'Clocked out successfully.', hoursWorked: hours, user: updatedUser });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Attendance registration failed.' });
  }
};

const getAttendanceHistory = async (req, res) => {
  try {
    let query = `
      SELECT a.*, u.name, u.role
      FROM attendance_records a
      JOIN users u ON a.user_id = u.id
    `;
    const params = [];

    // Waiters/Kitchen only fetch their own
    if (req.user.role !== 'admin') {
      query += ' WHERE a.user_id = $1';
      params.push(req.user.id);
    }

    query += ' ORDER BY a.record_date DESC, a.clock_in DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Attendance fetch error:', error);
    res.status(500).json({ error: 'Failed to retrieve attendance logs.' });
  }
};

// --- Staff Performance API ---

const getStaffPerformance = async (req, res) => {
  try {
    // 1. Waiters summary: Total orders, total revenue, average order value
    const waiterStats = await db.query(`
      SELECT u.id, u.name, u.email, u.shift_timing,
             COUNT(o.id) as total_orders,
             COALESCE(SUM(o.grand_total), 0.00) as total_revenue
      FROM users u
      LEFT JOIN orders o ON o.waiter_id = u.id AND o.status = 'paid'
      WHERE u.role = 'waiter'
      GROUP BY u.id
      ORDER BY total_revenue DESC
    `);

    // 2. Kitchen stats: Number of orders completed
    const kitchenStats = await db.query(`
      SELECT u.id, u.name, u.email, u.shift_timing,
             COALESCE(o.count, 0) as completed_orders
      FROM users u
      -- Since orders don't store kitchen_staff_id, we look at all completed or ready orders in database 
      -- or simulate general numbers. To track accurately we can also list all ready/paid orders in the database.
      CROSS JOIN (
        SELECT COUNT(*)::int as count FROM orders WHERE status IN ('ready', 'delivered', 'paid')
      ) o
      WHERE u.role = 'kitchen'
      GROUP BY u.id, o.count
    `);

    // 3. Weekly sales trend: Monday to Sunday of the current week (Monday index = 1, Sunday index = 0 in DOW)
    const salesTrendResult = await db.query(`
      SELECT 
        EXTRACT(DOW FROM created_at)::int as day_of_week,
        COALESCE(SUM(grand_total), 0.00)::float as daily_sum
      FROM orders
      WHERE status = 'paid' AND created_at >= date_trunc('week', CURRENT_DATE)
      GROUP BY EXTRACT(DOW FROM created_at)
    `);

    const weekSalesMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };
    salesTrendResult.rows.forEach(row => {
      weekSalesMap[row.day_of_week] = row.daily_sum;
    });

    const weeklySalesTrend = [
      weekSalesMap[1], // Mon
      weekSalesMap[2], // Tue
      weekSalesMap[3], // Wed
      weekSalesMap[4], // Thu
      weekSalesMap[5], // Fri
      weekSalesMap[6], // Sat
      weekSalesMap[0]  // Sun
    ];

    res.json({
      waiters: waiterStats.rows,
      kitchen: kitchenStats.rows,
      weeklySalesTrend: weeklySalesTrend,
    });
  } catch (error) {
    console.error('Performance analytics failure:', error);
    res.status(500).json({ error: 'Failed to compile metrics.' });
  }
};

module.exports = {
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  clockIn,
  clockOut,
  getAttendanceHistory,
  getStaffPerformance,
};
