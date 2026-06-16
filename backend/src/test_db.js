const db = require('./config/db');

async function checkOrders() {
  try {
    const ordersRes = await db.query('SELECT COUNT(*) FROM orders');
    console.log('Total orders in DB:', ordersRes.rows[0].count);

    const paidOrders = await db.query("SELECT * FROM orders WHERE status = 'paid'");
    console.log('Paid orders:', paidOrders.rows);

    const activeOrders = await db.query("SELECT * FROM orders WHERE status != 'paid'");
    console.log('Active orders:', activeOrders.rows);

    const salesTrendResult = await db.query(`
      SELECT 
        EXTRACT(DOW FROM created_at)::int as day_of_week,
        COALESCE(SUM(grand_total), 0.00)::float as daily_sum
      FROM orders
      WHERE status = 'paid' AND created_at >= date_trunc('week', CURRENT_DATE)
      GROUP BY EXTRACT(DOW FROM created_at)
    `);
    console.log('Weekly sales trend result rows:', salesTrendResult.rows);

  } catch (error) {
    console.error('Error querying DB:', error);
  } finally {
    db.pool.end();
  }
}

checkOrders();
