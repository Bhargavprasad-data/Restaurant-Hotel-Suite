const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'Restaurant',
  password: process.env.DB_PASSWORD || 'Bhargav11@prasad',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function test() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Database connected successfully:', res.rows[0]);

    // Let's test the FIXED kitchenStats query
    const kitchenStats = await pool.query(`
      SELECT u.id, u.name, u.email, u.shift_timing,
             COALESCE(o.count, 0) as completed_orders
      FROM users u
      CROSS JOIN (
        SELECT COUNT(*)::int as count FROM orders WHERE status IN ('ready', 'delivered', 'paid')
      ) o
      WHERE u.role = 'kitchen'
      GROUP BY u.id, o.count
    `);
    console.log('Fixed Kitchen Stats Result:', kitchenStats.rows);

  } catch (error) {
    console.error('Database connection or query failed:', error);
  } finally {
    await pool.end();
  }
}

test();
