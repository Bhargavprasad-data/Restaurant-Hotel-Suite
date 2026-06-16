const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function updateAdmin() {
  console.log('Updating Admin credentials in active database...');
  try {
    const passwordHash = await bcrypt.hash('Bhargav11@prasad', 10);
    const email = 'bhargavvana80@gmail.com';
    const name = 'Bhargav Vana';

    // Check if the user exists
    const checkResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (checkResult.rows.length > 0) {
      // User exists, update password and role
      await pool.query(
        'UPDATE users SET password_hash = $1, role = $2, name = $3 WHERE email = $4',
        [passwordHash, 'admin', name, email]
      );
      console.log(`Updated existing admin user: ${email}`);
    } else {
      // Create new admin user, or update existing 'admin@restaurant.com' to these details
      const oldCheck = await pool.query("SELECT * FROM users WHERE email = 'admin@restaurant.com'");
      if (oldCheck.rows.length > 0) {
        await pool.query(
          "UPDATE users SET name = $1, email = $2, password_hash = $3 WHERE email = 'admin@restaurant.com'",
          [name, email, passwordHash]
        );
        console.log(`Converted admin@restaurant.com to ${email}`);
      } else {
        await pool.query(
          "INSERT INTO users (name, email, password_hash, role, phone_number, shift_timing) VALUES ($1, $2, $3, 'admin', '9876543210', '09:00 - 18:00')",
          [name, email, passwordHash]
        );
        console.log(`Inserted new admin user: ${email}`);
      }
    }
    console.log('Admin credentials updated successfully!');
  } catch (error) {
    console.error('Error updating admin credentials:', error);
  } finally {
    await pool.end();
  }
}

updateAdmin();
