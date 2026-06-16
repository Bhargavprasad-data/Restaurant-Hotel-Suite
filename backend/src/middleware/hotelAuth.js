const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateHotelToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting: Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'supersecretrestaurantjwttokenkey123!');
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
};

const verifyHotelRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized access.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Permission denied. Access is restricted to [${allowedRoles.join(', ')}] roles.` 
      });
    }

    next();
  };
};

module.exports = {
  authenticateHotelToken,
  verifyHotelRole,
};
