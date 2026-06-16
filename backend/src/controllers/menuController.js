const db = require('../config/db');

const getMenu = async (req, res) => {
  const { admin, timeOverride } = req.query;

  try {
    // If admin is requesting, return all items
    if (admin === 'true') {
      const result = await db.query('SELECT * FROM menu_items ORDER BY category, name ASC');
      return res.json(result.rows);
    }

    // Determine current time (support override for easy sandbox testing)
    let hours;
    if (timeOverride) {
      const [h, m] = timeOverride.split(':');
      hours = parseInt(h);
    } else {
      // Get current local hour
      const now = new Date();
      hours = now.getHours();
    }

    // Define schedule rules:
    // Lunch: 11:00 AM to 4:00 PM (inclusive: 11 - 15)
    // Dinner: 4:00 PM to 11:00 PM (inclusive: 16 - 22)
    // Outside these hours, allow all or display dinner as default
    let schedule = 'all';
    if (hours >= 11 && hours < 16) {
      schedule = 'lunch';
    } else if (hours >= 16 && hours < 23) {
      schedule = 'dinner';
    }

    const query = `
      SELECT * FROM menu_items 
      WHERE is_available = true 
      AND (time_restriction = 'all' OR time_restriction = $1)
      ORDER BY category, name ASC
    `;

    const result = await db.query(query, [schedule]);
    res.json({
      current_schedule: schedule,
      menu: result.rows,
    });

  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Failed to retrieve menu items.' });
  }
};

const createMenuItem = async (req, res) => {
  const { name, description, price, category, time_restriction, image_url } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO menu_items (name, description, price, category, time_restriction, is_available, image_url) 
       VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING *`,
      [name, description, price, category, time_restriction || 'all', image_url || null]
    );

    const newItem = result.rows[0];
    const io = req.app.get('io');
    if (io) {
      io.emit('menu-update', { action: 'create', item: newItem });
    }

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item.' });
  }
};

const updateMenuItem = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, time_restriction, is_available, image_url } = req.body;

  try {
    // Check if menu item exists
    const checkItem = await db.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    if (checkItem.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    let query = 'UPDATE menu_items SET ';
    const params = [];
    let count = 1;

    if (name !== undefined) {
      query += `name = $${count}, `;
      params.push(name);
      count++;
    }
    if (description !== undefined) {
      query += `description = $${count}, `;
      params.push(description);
      count++;
    }
    if (price !== undefined) {
      query += `price = $${count}, `;
      params.push(price);
      count++;
    }
    if (category !== undefined) {
      query += `category = $${count}, `;
      params.push(category);
      count++;
    }
    if (time_restriction !== undefined) {
      query += `time_restriction = $${count}, `;
      params.push(time_restriction);
      count++;
    }
    if (is_available !== undefined) {
      query += `is_available = $${count}, `;
      params.push(is_available);
      count++;
    }
    if (image_url !== undefined) {
      query += `image_url = $${count}, `;
      params.push(image_url);
      count++;
    }

    // Remove trailing comma
    query = query.slice(0, -2);
    query += ` WHERE id = $${count} RETURNING *`;
    params.push(id);

    const result = await db.query(query, params);
    const updatedItem = result.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.emit('menu-update', { action: 'update', item: updatedItem });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item.' });
  }
};

const deleteMenuItem = async (req, res) => {
  const { id } = req.params;

  try {
    const checkItem = await db.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    if (checkItem.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    await db.query('DELETE FROM menu_items WHERE id = $1', [id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('menu-update', { action: 'delete', item: { id: parseInt(id) } });
    }

    res.json({ message: 'Menu item deleted successfully.' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item. Make sure no existing orders reference this item.' });
  }
};

module.exports = {
  getMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
