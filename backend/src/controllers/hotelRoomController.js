const db = require('../config/db');

const getRooms = async (req, res) => {
  try {
    const { room_type, max_price, capacity, availability_status, search, page = 1, limit = 10 } = req.query;

    let queryText = 'SELECT * FROM rooms WHERE 1=1';
    const queryParams = [];
    let paramCounter = 1;

    if (room_type) {
      queryText += ` AND room_type = $${paramCounter}`;
      queryParams.push(room_type);
      paramCounter++;
    }

    if (max_price) {
      queryText += ` AND price <= $${paramCounter}`;
      queryParams.push(parseFloat(max_price));
      paramCounter++;
    }

    if (capacity) {
      queryText += ` AND capacity >= $${paramCounter}`;
      queryParams.push(parseInt(capacity));
      paramCounter++;
    }

    if (availability_status) {
      queryText += ` AND availability_status = $${paramCounter}`;
      queryParams.push(availability_status);
      paramCounter++;
    }

    if (search) {
      queryText += ` AND (room_number ILIKE $${paramCounter} OR description ILIKE $${paramCounter})`;
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    // Get total count for pagination before appending LIMIT/OFFSET
    const countResult = await db.query(queryText.replace('SELECT *', 'SELECT COUNT(*)'), queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryText += ` ORDER BY created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    queryParams.push(parseInt(limit), offset);

    const roomsResult = await db.query(queryText, queryParams);

    res.json({
      rooms: roomsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Fetch Rooms Error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve room listings.' });
  }
};

const getRoomById = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch Room particulars
    const roomResult = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room listing not found.' });
    }
    const room = roomResult.rows[0];

    // 2. Fetch Associated reviews
    const reviewsResult = await db.query(
      `SELECT r.*, u.name as reviewer_name 
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.room_id = $1 
       ORDER BY r.created_at DESC`,
      [id]
    );

    res.json({
      ...room,
      reviews: reviewsResult.rows
    });

  } catch (error) {
    console.error('Fetch Room Details Error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve room particulars.' });
  }
};

const createRoom = async (req, res) => {
  const { room_number, room_type, price, capacity, description, amenities, image_url } = req.body;

  if (!room_number || !room_type || !price || !capacity) {
    return res.status(400).json({ error: 'Please provide room number, type, price, and capacity.' });
  }

  try {
    // Check duplication
    const duplicateCheck = await db.query('SELECT * FROM rooms WHERE room_number = $1', [room_number]);
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: `Room number ${room_number} already exists.` });
    }

    const amenitiesArray = Array.isArray(amenities) ? amenities : [];

    const roomResult = await db.query(
      `INSERT INTO rooms (room_number, room_type, price, capacity, description, amenities, image_url, availability_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'available') RETURNING *`,
      [room_number, room_type, price, capacity, description || '', amenitiesArray, image_url || '']
    );

    const createdRoom = roomResult.rows[0];
    const io = req.app.get('io');
    if (io) {
      io.to('hotel').emit('room:updated', { action: 'create', room: createdRoom, sender_id: req.user?.id });
    }

    res.status(201).json({
      message: 'Room catalog created successfully!',
      room: createdRoom
    });

  } catch (error) {
    console.error('Create Room Error:', error.message);
    res.status(500).json({ error: 'Failed to create room inventory.' });
  }
};

const updateRoom = async (req, res) => {
  const { id } = req.params;
  const { room_number, room_type, price, capacity, description, amenities, image_url, availability_status } = req.body;

  try {
    const roomCheck = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Room listing not found.' });
    }

    if (room_number) {
      const duplicateCheck = await db.query('SELECT * FROM rooms WHERE room_number = $1 AND id != $2', [room_number, id]);
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: `Room number ${room_number} is occupied by another room listing.` });
      }
    }

    const currentRoom = roomCheck.rows[0];
    const newRoomNumber = room_number || currentRoom.room_number;
    const newRoomType = room_type || currentRoom.room_type;
    const newPrice = price !== undefined ? price : currentRoom.price;
    const newCapacity = capacity !== undefined ? capacity : currentRoom.capacity;
    const newDescription = description !== undefined ? description : currentRoom.description;
    const newAmenities = Array.isArray(amenities) ? amenities : currentRoom.amenities;
    const newImageUrl = image_url !== undefined ? image_url : currentRoom.image_url;
    const newStatus = availability_status || currentRoom.availability_status;

    const updateResult = await db.query(
      `UPDATE rooms 
       SET room_number = $1, room_type = $2, price = $3, capacity = $4, description = $5, amenities = $6, image_url = $7, availability_status = $8
       WHERE id = $9 RETURNING *`,
      [newRoomNumber, newRoomType, newPrice, newCapacity, newDescription, newAmenities, newImageUrl, newStatus, id]
    );

    const updatedRoom = updateResult.rows[0];
    const io = req.app.get('io');
    if (io) {
      io.to('hotel').emit('room:updated', { action: 'update', room: updatedRoom, sender_id: req.user?.id });
    }

    res.json({
      message: 'Room catalog updated successfully!',
      room: updatedRoom
    });

  } catch (error) {
    console.error('Update Room Error:', error.message);
    res.status(500).json({ error: 'Failed to update room catalog details.' });
  }
};

const deleteRoom = async (req, res) => {
  const { id } = req.params;

  try {
    const roomCheck = await db.query('SELECT * FROM rooms WHERE id = $1', [id]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Room listing not found.' });
    }

    // Check if room has active bookings
    const activeBookingCheck = await db.query(
      `SELECT * FROM bookings WHERE room_id = $1 AND booking_status IN ('Pending', 'Confirmed', 'Checked In')`,
      [id]
    );
    if (activeBookingCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete room listing. There are active reservations associated with it.' 
      });
    }

    await db.query('DELETE FROM rooms WHERE id = $1', [id]);

    const io = req.app.get('io');
    if (io) {
      io.to('hotel').emit('room:updated', { action: 'delete', id, sender_id: req.user?.id });
    }

    res.json({ message: 'Room catalog deleted successfully!' });

  } catch (error) {
    console.error('Delete Room Error:', error.message);
    res.status(500).json({ error: 'Failed to remove room listing.' });
  }
};

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
