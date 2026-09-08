require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const apiRoutes = require('./routes/api');
const hotelApiRoutes = require('./routes/hotelApi');
const { startCheckoutScheduler } = require('./services/checkoutReminderScheduler');


const app = express();
const server = http.createServer(app);

// Allow all three dashboard origins (admin :5173, waiter :5174, kitchen :5175) and dynamic localhost ports in development
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

const checkOrigin = (origin, callback) => {
  // Allow requests with no origin (e.g. curl, Postman, mobile apps)
  if (!origin) {
    callback(null, true);
    return;
  }
  
  // Allow configured origins, local development, or any onrender.com subdomains
  if (
    allowedOrigins.includes(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
    origin.endsWith('.onrender.com')
  ) {
    callback(null, true);
  } else {
    callback(new Error(`CORS blocked for origin: ${origin}`));
  }
};

app.use(cors({
  origin: checkOrigin,
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: checkOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }
});

// Make Socket.IO accessible in routes/controllers
app.set('io', io);

// WebSocket event handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`👥 Client ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Bind API Routes
app.use('/api', apiRoutes);
app.use('/api/hotel', hotelApiRoutes);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected error occurred on the server.',
  });
});

// Auto-seed database if tables don't exist
async function autoSeedDatabase() {
  try {
    const { pool } = require('./config/db');
    const res = await pool.query("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1;");
    const { execSync } = require('child_process');
    
    if (res.rowCount === 0) {
      console.log('📡 Database tables not found. Running auto-seeding...');
      execSync('npm run seed', { stdio: 'inherit' });
      console.log('🎉 Database successfully seeded!');
    } else {
      console.log('✅ Users table verified.');
      // Check if hotel tables exist
      const roomRes = await pool.query("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rooms' LIMIT 1;");
      if (roomRes.rowCount === 0) {
        console.log('📡 Hotel tables not found. Running hotel migration...');
        execSync('node src/config/setup_hotel_db.js', { stdio: 'inherit' });
        console.log('🎉 Hotel Database successfully migrated!');
      } else {
        console.log('✅ Hotel tables verified. Skipping seeding.');
      }
    }

    // Always ensure admin credentials for hotel & restaurant consoles
    await ensureAdminUser(pool);
  } catch (err) {
    console.error('❌ Database verification/auto-seed failed:', err);
  }
}

async function ensureAdminUser(pool) {
  try {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Bhargav11@prasad', 10);
    const email = 'bhargavvana80@gmail.com';
    const name = 'Bhargav Vana';

    // Ensure is_verified column exists
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;');

    // Ensure role constraint allows 'admin', 'waiter', 'kitchen', 'customer'
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
          ALTER TABLE users DROP CONSTRAINT users_role_check;
        END IF;
      END $$;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'waiter', 'kitchen', 'customer'));
    `);

    // Check if admin user exists
    const check = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (check.rows.length > 0) {
      await pool.query(
        'UPDATE users SET name = $1, password_hash = $2, role = $3, is_verified = TRUE WHERE LOWER(email) = LOWER($4)',
        [name, passwordHash, 'admin', email]
      );
      console.log(`✅ Admin credentials verified & updated for: ${email}`);
    } else {
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, phone_number, shift_timing, is_verified)
         VALUES ($1, $2, $3, 'admin', '9876543210', '09:00 - 18:00', TRUE)`,
        [name, email.toLowerCase(), passwordHash]
      );
      console.log(`✅ Admin user created: ${email}`);
    }
  } catch (err) {
    console.error('⚠️ Could not verify admin user:', err.message);
  }
}

// Launch server
const PORT = process.env.PORT || 5000;
autoSeedDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Smart Restaurant Backend running on http://localhost:${PORT}`);
    startCheckoutScheduler(io);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Run this in PowerShell to free it:`);
    console.error(`   $p=(netstat -ano|Select-String ":${PORT}"|Select-String LISTENING|%{($_ -split "\\s+")[-1]}|Select -First 1); if($p){taskkill /PID $p /F}\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

