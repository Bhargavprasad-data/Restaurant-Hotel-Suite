const db = require('../config/db');
const razorpayService = require('../services/razorpayService');
const twilioService = require('../services/twilioService');

const placeOrder = async (req, res) => {
  const { customer_name, customer_phone, table_id, items } = req.body;
  const waiter_id = req.user.id;

  if (!customer_name || !customer_phone || !table_id || !items || !items.length) {
    return res.status(400).json({ error: 'Please provide customer name, phone, table number, and items.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if table is available
    const tableCheck = await client.query('SELECT * FROM tables WHERE id = $1', [table_id]);
    if (tableCheck.rows.length === 0) {
      throw new Error('Selected table does not exist.');
    }
    const table = tableCheck.rows[0];
    if (table.status !== 'available') {
      throw new Error(`Table ${table.table_number} is currently occupied.`);
    }

    // 2. Insert Order
    const orderResult = await client.query(
      `INSERT INTO orders (customer_name, customer_phone, table_id, waiter_id, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [customer_name, customer_phone, table_id, waiter_id]
    );
    const order = orderResult.rows[0];

    // 3. Insert Order Items & Accumulate Total
    let totalAmount = 0;
    const orderItemsDetails = [];

    for (const item of items) {
      const menuCheck = await client.query('SELECT * FROM menu_items WHERE id = $1', [item.menu_item_id]);
      if (menuCheck.rows.length === 0) {
        throw new Error('Some items in the order are invalid.');
      }
      const menuItem = menuCheck.rows[0];
      const itemPrice = parseFloat(menuItem.price);
      const subtotal = itemPrice * item.quantity;
      totalAmount += subtotal;

      const orderItemResult = await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, price, special_notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [order.id, item.menu_item_id, item.quantity, itemPrice, item.special_notes || '']
      );

      orderItemsDetails.push({
        ...orderItemResult.rows[0],
        menu_item_name: menuItem.name,
      });
    }

    // 4. Update table status to occupied (Red)
    const tableUpdateResult = await client.query(
      'UPDATE tables SET status = \'occupied\' WHERE id = $1 RETURNING *',
      [table_id]
    );
    const updatedTable = tableUpdateResult.rows[0];

    await client.query('COMMIT');

    const io = req.app.get('io');
    
    // Broadcast updates
    if (io) {
      io.emit('new-order', {
        ...order,
        items: orderItemsDetails,
        table_number: updatedTable.table_number,
      });
      io.emit('table-update', { action: 'update', table: updatedTable });
    }

    res.status(201).json({
      message: 'Order submitted successfully!',
      order: {
        ...order,
        items: orderItemsDetails,
      },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Order placement error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to submit order.' });
  } finally {
    client.release();
  }
};

const getActiveOrders = async (req, res) => {
  try {
    const ordersResult = await db.query(`
      SELECT o.*, t.table_number, u.name as waiter_name
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.status != 'paid'
      ORDER BY o.created_at DESC
    `);

    // Fetch items for each order
    const orders = [];
    for (const order of ordersResult.rows) {
      const itemsResult = await db.query(`
        SELECT oi.*, mi.name as menu_item_name
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE oi.order_id = $1
      `, [order.id]);
      
      orders.push({
        ...order,
        items: itemsResult.rows,
      });
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching active orders:', error);
    res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // pending -> cooking -> ready -> delivered

  if (!['cooking', 'ready', 'delivered'].includes(status)) {
    return res.status(400).json({ error: 'Invalid order status transition.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch current order details
    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      throw new Error('Order not found.');
    }
    const order = orderResult.rows[0];

    // 2. State machine checking
    let newTableStatus;
    if (status === 'cooking') {
      newTableStatus = 'cooking'; // Yellow
    } else if (status === 'ready') {
      newTableStatus = 'ready'; // Blue
    } else if (status === 'delivered') {
      newTableStatus = 'occupied'; // Keep Red while customer dines and pays
    }

    // 3. Update order status
    const updatedOrderResult = await client.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    let updatedOrder = updatedOrderResult.rows[0];

    // 4. Update associated table status
    const tableUpdateResult = await client.query(
      'UPDATE tables SET status = $1 WHERE id = $2 RETURNING *',
      [newTableStatus, order.table_id]
    );
    const updatedTable = tableUpdateResult.rows[0];

    // 5. If status is DELIVERED, automatically compile and generate customer bill!
    if (status === 'delivered') {
      // Calculate order items price sum
      const itemsSumResult = await client.query(
        'SELECT SUM(quantity * price) as sum FROM order_items WHERE order_id = $1',
        [id]
      );
      
      const total = parseFloat(itemsSumResult.rows[0].sum || 0);
      const taxRate = 0.05; // 5% GST
      const tax = total * taxRate;
      const grandTotal = total + tax;

      // Create online payment order (Razorpay)
      const paymentInfo = await razorpayService.createPaymentOrder(id, grandTotal);

      // Save billing metrics into database
      const billedOrderResult = await client.query(
        `UPDATE orders 
         SET total_amount = $1, tax_amount = $2, grand_total = $3, razorpay_order_id = $4 
         WHERE id = $5 RETURNING *`,
        [total, tax, grandTotal, paymentInfo.razorpayOrderId, id]
      );
      updatedOrder = billedOrderResult.rows[0];

      // Dispatch Twilio WhatsApp SMS
      await twilioService.sendWhatsAppBill(
        order.customer_phone,
        order.customer_name,
        updatedTable.table_number.toString(),
        grandTotal.toFixed(2),
        paymentInfo.paymentLink
      );
    }

    await client.query('COMMIT');

    // Fetch full order with items for broadcasting
    const itemsResult = await client.query(`
      SELECT oi.*, mi.name as menu_item_name
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
    `, [id]);

    const fullOrderPayload = {
      ...updatedOrder,
      items: itemsResult.rows,
      table_number: updatedTable.table_number,
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', fullOrderPayload);
      io.emit('table-update', { action: 'update', table: updatedTable });
      
      // Specialize notification to waiters if order is ready to serve!
      if (status === 'ready') {
        io.emit('notification', {
          id: Math.random().toString(36).substring(2, 9),
          message: `🍽️ Order for Table ${updatedTable.table_number} is ready to serve!`,
          type: 'ready',
          table_id: order.table_id,
          order_id: id,
        });
      }
    }

    res.json(fullOrderPayload);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Status transition failure:', error.message);
    res.status(400).json({ error: error.message || 'Failed to update order status.' });
  } finally {
    client.release();
  }
};

const simulatePaymentSuccess = async (req, res) => {
  const { id } = req.params;
  const { razorpay_payment_id, method } = req.body;

  if (!razorpay_payment_id) {
    return res.status(400).json({ error: 'Please provide razorpay_payment_id.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch current order
    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      throw new Error('Order not found.');
    }
    const order = orderResult.rows[0];

    if (order.status === 'paid') {
      throw new Error('This order is already paid.');
    }

    // 2. Insert payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (order_id, razorpay_payment_id, amount, status, method)
       VALUES ($1, $2, $3, 'successful', $4) RETURNING *`,
      [id, razorpay_payment_id, order.grand_total, method || 'UPI']
    );

    // 3. Update order status to paid
    const updatedOrderResult = await client.query(
      'UPDATE orders SET status = \'paid\', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    const updatedOrder = updatedOrderResult.rows[0];

    // 4. Free up table back to available (Green)
    const tableUpdateResult = await client.query(
      'UPDATE tables SET status = \'available\' WHERE id = $1 RETURNING *',
      [order.table_id]
    );
    const updatedTable = tableUpdateResult.rows[0];

    await client.query('COMMIT');

    const itemsResult = await client.query(`
      SELECT oi.*, mi.name as menu_item_name
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
    `, [id]);

    const fullOrderPayload = {
      ...updatedOrder,
      items: itemsResult.rows,
      table_number: updatedTable.table_number,
      payment: paymentResult.rows[0],
    };

    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', fullOrderPayload);
      io.emit('table-update', { action: 'update', table: updatedTable });
      io.emit('notification', {
        id: Math.random().toString(36).substring(2, 9),
        message: `💳 Bill for Table ${updatedTable.table_number} is PAID successfully!`,
        type: 'paid',
        table_id: order.table_id,
        order_id: id,
      });
      io.emit('payment-success', {
        table_number: updatedTable.table_number,
        table_id: order.table_id,
        order_id: id,
        amount: order.grand_total,
      });
    }

    res.json({
      message: 'Payment simulated successfully! Green bill generated.',
      order: fullOrderPayload,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment simulation failure:', error.message);
    res.status(400).json({ error: error.message || 'Payment simulation failed.' });
  } finally {
    client.release();
  }
};

const getOrderReceipt = async (req, res) => {
  const { id } = req.params;

  try {
    const orderResult = await db.query(`
      SELECT o.*, t.table_number, u.name as waiter_name
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderResult.rows[0];

    const itemsResult = await db.query(`
      SELECT oi.*, mi.name as menu_item_name
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
    `, [id]);

    const paymentResult = await db.query('SELECT * FROM payments WHERE order_id = $1', [id]);

    res.json({
      ...order,
      items: itemsResult.rows,
      payment: paymentResult.rows.length > 0 ? paymentResult.rows[0] : null,
    });

  } catch (error) {
    console.error('Receipt generation failure:', error);
    res.status(500).json({ error: 'Failed to generate receipt.' });
  }
};

const sendWhatsAppBillManual = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch current order details
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    const order = orderResult.rows[0];

    // 2. Fetch table number
    const tableResult = await db.query('SELECT * FROM tables WHERE id = $1', [order.table_id]);
    const tableNum = tableResult.rows.length > 0 ? tableResult.rows[0].table_number : 'N/A';

    // 3. Generate secure payment/checkout link
    const checkoutUrl = `${process.env.FRONTEND_URL || 'http://localhost:5177'}/checkout/simulated?order_id=${order.id}&razorpay_order_id=${order.razorpay_order_id}&amount=${order.grand_total}`;

    // 4. Dispatch WhatsApp message via Twilio service
    const twilioResult = await twilioService.sendWhatsAppBill(
      order.customer_phone,
      order.customer_name,
      tableNum.toString(),
      parseFloat(order.grand_total).toFixed(2),
      checkoutUrl
    );

    if (twilioResult.mock) {
      return res.json({
        success: true,
        message: 'Sent in Sandbox/Simulator mode.',
        mock: true,
        error: twilioResult.error
      });
    }

    res.json({
      success: true,
      message: 'WhatsApp message successfully dispatched automatically via Twilio!',
      sid: twilioResult.sid,
      mock: false
    });

  } catch (error) {
    console.error('Manual WhatsApp notification dispatch failure:', error.message);
    res.status(500).json({ error: error.message || 'Failed to dispatch manual WhatsApp notification.' });
  }
};

module.exports = {
  placeOrder,
  getActiveOrders,
  updateOrderStatus,
  simulatePaymentSuccess,
  getOrderReceipt,
  sendWhatsAppBillManual,
};
