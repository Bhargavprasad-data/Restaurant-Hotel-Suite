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

// Launch server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Smart Restaurant Backend running on http://localhost:${PORT}`);
  startCheckoutScheduler(io);
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

