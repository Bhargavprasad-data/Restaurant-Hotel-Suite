const db = require('../config/db');

const submitReview = async (req, res) => {
  const { room_id, rating, comment } = req.body;
  const user_id = req.user.id;

  if (!room_id || !rating) {
    return res.status(400).json({ error: 'Please provide room ID and a rating rating (1 to 5).' });
  }

  const parsedRating = parseInt(rating);
  if (parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
  }

  try {
    // 1. Verify if user has stayed in this room before reviewing
    const stayCheck = await db.query(
      `SELECT * FROM bookings 
       WHERE user_id = $1 AND room_id = $2 AND booking_status = 'Checked Out' AND payment_status = 'Paid'`,
      [user_id, room_id]
    );

    if (stayCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Only customers who have successfully checked out of this room are permitted to leave reviews.' 
      });
    }

    // 2. Insert Review (UPSERT if they review again)
    const reviewResult = await db.query(
      `INSERT INTO reviews (user_id, room_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, room_id) 
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [user_id, room_id, parsedRating, comment || '']
    );

    const review = reviewResult.rows[0];

    // Emit live WebSocket notification to hotel-admin
    const io = req.app.get('io');
    if (io) {
      try {
        const details = await db.query(
          `SELECT u.name, ro.room_number 
           FROM users u, rooms ro 
           WHERE u.id = $1 AND ro.id = $2`,
          [user_id, room_id]
        );
        const name = details.rows[0]?.name || 'Guest';
        const roomNum = details.rows[0]?.room_number || '';

        io.to('hotel').emit('review:created', {
          reviewer_name: name,
          room_number: roomNum,
          rating: parsedRating,
          comment: comment || ''
        });
      } catch (err) {
        console.error('Failed to dispatch review socket notification:', err.message);
      }
    }

    res.status(201).json({
      message: 'Thank you for your rating! Your review was recorded.',
      review
    });

  } catch (error) {
    console.error('Submit Review Error:', error.message);
    res.status(500).json({ error: 'Failed to submit review feedback.' });
  }
};

const getRoomReviews = async (req, res) => {
  const { room_id } = req.params;

  try {
    const reviewsResult = await db.query(
      `SELECT r.*, u.name as reviewer_name 
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.room_id = $1
       ORDER BY r.created_at DESC`,
      [room_id]
    );

    res.json(reviewsResult.rows);
  } catch (error) {
    console.error('Get Reviews Error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve room reviews.' });
  }
};

module.exports = {
  submitReview,
  getRoomReviews,
};
