const db = require('../config/db');

const getTables = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tables ORDER BY table_number ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to retrieve tables.' });
  }
};

const createTable = async (req, res) => {
  const { table_number, capacity } = req.body;

  if (!table_number || !capacity) {
    return res.status(400).json({ error: 'Table number and capacity are required.' });
  }

  try {
    // Check if table number exists
    const checkTable = await db.query('SELECT * FROM tables WHERE table_number = $1', [table_number]);
    if (checkTable.rows.length > 0) {
      return res.status(400).json({ error: `Table number ${table_number} already exists.` });
    }

    const result = await db.query(
      'INSERT INTO tables (table_number, capacity, status) VALUES ($1, $2, \'available\') RETURNING *',
      [table_number, capacity]
    );

    const newTable = result.rows[0];
    
    // Broadcast real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('table-update', { action: 'create', table: newTable });
    }

    res.status(201).json(newTable);
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'Failed to create table.' });
  }
};

const updateTable = async (req, res) => {
  const { id } = req.params;
  const { capacity, status, table_number } = req.body;

  try {
    // Check if table exists
    const checkTable = await db.query('SELECT * FROM tables WHERE id = $1', [id]);
    if (checkTable.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found.' });
    }

    // Build update parameters dynamically
    let query = 'UPDATE tables SET ';
    const params = [];
    let count = 1;

    if (capacity !== undefined) {
      query += `capacity = $${count}, `;
      params.push(capacity);
      count++;
    }
    if (status !== undefined) {
      query += `status = $${count}, `;
      params.push(status);
      count++;
    }
    if (table_number !== undefined) {
      // Check unique constraint first
      const checkNum = await db.query('SELECT * FROM tables WHERE table_number = $1 AND id != $2', [table_number, id]);
      if (checkNum.rows.length > 0) {
        return res.status(400).json({ error: `Table number ${table_number} is already in use.` });
      }
      query += `table_number = $${count}, `;
      params.push(table_number);
      count++;
    }

    // Remove trailing comma
    query = query.slice(0, -2);
    query += ` WHERE id = $${count} RETURNING *`;
    params.push(id);

    const result = await db.query(query, params);
    const updatedTable = result.rows[0];

    // Broadcast table update in real time
    const io = req.app.get('io');
    if (io) {
      io.emit('table-update', { action: 'update', table: updatedTable });
    }

    res.json(updatedTable);
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Failed to update table.' });
  }
};

const deleteTable = async (req, res) => {
  const { id } = req.params;

  try {
    const checkTable = await db.query('SELECT * FROM tables WHERE id = $1', [id]);
    if (checkTable.rows.length === 0) {
      return res.status(404).json({ error: 'Table not found.' });
    }

    await db.query('DELETE FROM tables WHERE id = $1', [id]);

    // Broadcast real-time removal
    const io = req.app.get('io');
    if (io) {
      io.emit('table-update', { action: 'delete', table: { id: parseInt(id) } });
    }

    res.json({ message: 'Table deleted successfully.' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: 'Failed to delete table. Make sure it has no active dependencies.' });
  }
};

module.exports = {
  getTables,
  createTable,
  updateTable,
  deleteTable,
};
