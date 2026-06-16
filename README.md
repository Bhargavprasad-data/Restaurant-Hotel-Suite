# H & R - Hotel & Restaurant Management System

A comprehensive, real-time hotel and restaurant management system with multiple dashboards for administrators, staff, and customers.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [System Requirements](#system-requirements)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [API Documentation](#api-documentation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

## 🎯 Overview

H & R is a full-stack, real-time management platform designed to streamline operations for hotels and restaurants. It provides separate interfaces for different user roles:

- **Restaurant Admin**: Manage tables, menus, staff, and orders
- **Hotel Admin**: Manage rooms, bookings, guests, and payments
- **Kitchen Staff**: View and manage orders in real-time
- **Waiters**: Process orders, manage tables
- **Hotel Guests**: Browse rooms, make bookings, track reservations

The system uses WebSocket technology for real-time updates across all dashboards and integrates with payment gateways and communication services.

## 🏗️ Architecture

The application consists of **5 frontend applications** and **1 backend API server**:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Applications                 │
├──────────────────┬──────────────────┬──────────────────┤
│ Admin Dashboard  │ Waiter Dashboard │ Kitchen Dashboard│
│   (Port 5173)    │   (Port 5174)    │   (Port 5175)    │
├──────────────────┬──────────────────┤
│  Hotel Admin     │  Hotel Customer  │
│  (Port 5181)     │   (Port 5180)    │
└──────────────────┴──────────────────┘
          │                    │
          └────────┬───────────┘
                   │ (WebSocket & REST API)
          ┌────────▼─────────┐
          │  Backend Server  │
          │   (Port 5000)    │
          └────────┬─────────┘
                   │
          ┌────────▼─────────┐
          │  PostgreSQL DB   │
          └──────────────────┘
```

## 💻 System Requirements

- **Node.js**: v14 or higher
- **npm**: v6 or higher
- **PostgreSQL**: v12 or higher
- **Git**: Latest version
- **RAM**: Minimum 2GB
- **Disk Space**: Minimum 500MB

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "H & R"
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Frontend Applications Setup

Run the following commands in each frontend directory:

```bash
# Admin Dashboard
cd admin-dashboard
npm install

# Waiter Dashboard
cd ../waiter-dashboard
npm install

# Kitchen Dashboard
cd ../kitchen-dashboard
npm install

# Hotel Admin
cd ../hotel-admin
npm install

# Hotel Customer
cd ../hotel-customer
npm install
```

### 4. Environment Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_restaurant_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secrets
JWT_SECRET=your_jwt_secret_key_here
HOTEL_JWT_SECRET=your_hotel_jwt_secret_key_here

# Email Service (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Twilio SMS (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Frontend URLs
FRONTEND_URL=http://localhost:5173
```

### 5. Database Setup

```bash
cd backend
npm run seed
```

This will:
- Create the database schema
- Seed initial data
- Set up admin accounts

## 🚀 Running the Application

### Option 1: Individual Terminal Windows

**Terminal 1 - Backend Server**
```bash
cd backend
npm run dev
# Server will start on http://localhost:5000
```

**Terminal 2 - Admin Dashboard**
```bash
cd admin-dashboard
npm run dev
# Dashboard will run on http://localhost:5173
```

**Terminal 3 - Waiter Dashboard**
```bash
cd waiter-dashboard
npm run dev
# Dashboard will run on http://localhost:5174
```

**Terminal 4 - Kitchen Dashboard**
```bash
cd kitchen-dashboard
npm run dev
# Dashboard will run on http://localhost:5175
```

**Terminal 5 - Hotel Admin**
```bash
cd hotel-admin
npm run dev
# Dashboard will run on http://localhost:5181
```

**Terminal 6 - Hotel Customer**
```bash
cd hotel-customer
npm run dev
# Dashboard will run on http://localhost:5180
```

### Option 2: Production Build

Build all frontend applications:

```bash
# Admin Dashboard
cd admin-dashboard
npm run build

# Waiter Dashboard
cd ../waiter-dashboard
npm run build

# Kitchen Dashboard
cd ../kitchen-dashboard
npm run build

# Hotel Admin
cd ../hotel-admin
npm run build

# Hotel Customer
cd ../hotel-customer
npm run build
```

Run the backend in production:

```bash
cd backend
npm start
```

## 📁 Project Structure

```
H & R/
├── admin-dashboard/                 # Restaurant Management Admin Panel
│   ├── src/
│   │   ├── components/              # Reusable React components
│   │   ├── context/                 # Context API (Auth, Socket, Theme)
│   │   ├── pages/                   # Page components
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── waiter-dashboard/                # Waiter Management Dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── kitchen-dashboard/               # Kitchen Orders Dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── hotel-admin/                     # Hotel Management Admin Panel
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
│
├── hotel-customer/                  # Hotel Booking & Guest Interface
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
│
└── backend/                         # Express.js Backend API
    ├── src/
    │   ├── index.js                 # Main server entry point
    │   ├── config/
    │   │   ├── db.js                # Database connection
    │   │   ├── schema.sql           # Database schema
    │   │   ├── seed.js              # Initial data seeding
    │   │   └── setup_hotel_db.js    # Hotel DB initialization
    │   ├── controllers/             # API endpoint logic
    │   │   ├── authController.js
    │   │   ├── hotelAuthController.js
    │   │   ├── hotelAdminController.js
    │   │   ├── hotelBookingController.js
    │   │   ├── hotelPaymentController.js
    │   │   ├── hotelReviewController.js
    │   │   ├── hotelRoomController.js
    │   │   ├── menuController.js
    │   │   ├── orderController.js
    │   │   ├── staffController.js
    │   │   └── tableController.js
    │   ├── middleware/              # Express middleware
    │   │   ├── auth.js              # JWT authentication
    │   │   └── hotelAuth.js
    │   ├── routes/                  # API route definitions
    │   │   ├── api.js               # Restaurant API routes
    │   │   └── hotelApi.js          # Hotel API routes
    │   ├── services/                # Business logic & external integrations
    │   │   ├── hotelEmailService.js
    │   │   ├── razorpayService.js   # Payment processing
    │   │   ├── twilioService.js     # SMS notifications
    │   │   └── checkoutReminderScheduler.js
    │   ├── setup_admin.js
    │   └── verify_hotel.js
    ├── package.json
    └── .env                         # Environment variables
```

## 🛠️ Technologies Used

### Frontend
- **React 18.3**: UI library
- **Vite 5.2**: Build tool and dev server
- **React Router DOM 6.23**: Client-side routing
- **Axios 1.6-1.13**: HTTP client
- **Socket.IO Client 4.7-4.8**: Real-time WebSocket
- **Lucide React**: Icon library
- **Framer Motion**: Animation library
- **React Hot Toast**: Toast notifications
- **Tailwind CSS**: Utility-first CSS framework (hotel apps)

### Backend
- **Node.js**: JavaScript runtime
- **Express 4.19**: Web framework
- **PostgreSQL 8.11**: Relational database
- **Socket.IO 4.7**: Real-time bidirectional communication
- **JWT (jsonwebtoken)**: Authentication tokens
- **bcryptjs**: Password hashing
- **Nodemailer 8.0**: Email service
- **Twilio 5.0**: SMS service
- **Razorpay 2.9**: Payment gateway
- **dotenv**: Environment variable management
- **CORS**: Cross-origin resource sharing
- **Nodemon**: Development auto-reload

## ✨ Features

### Restaurant Management (Admin Dashboard)
- 📊 Dashboard overview with statistics
- 🍽️ Table management and reservation
- 📋 Menu management (create, edit, delete items)
- 👥 Staff management and roles
- 📦 Order management and tracking
- 💰 Payment and billing
- 📈 Reports and analytics

### Waiter Dashboard
- 📱 Real-time order management
- 🔔 Order notifications
- 📋 Table status tracking
- ✅ Order confirmation workflow
- 💬 Communication with kitchen

### Kitchen Dashboard
- 👨‍🍳 Real-time order display
- ⏱️ Order prioritization
- ✅ Order completion tracking
- 🔔 Order notifications
- 📊 Kitchen performance metrics

### Hotel Management (Admin)
- 🏨 Room management and inventory
- 📅 Booking management
- 👤 Guest management
- 💳 Payment processing
- ⭐ Guest reviews
- 📧 Email notifications
- 📞 SMS notifications

### Hotel Customer
- 🔍 Room search and filtering
- 📅 Availability checking
- 💳 Online booking
- 🔐 Guest account management
- 📧 Confirmation emails
- 💬 Hotel communication

## 📡 API Documentation

### Authentication Endpoints
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - User login
GET    /api/auth/profile           - Get user profile
PUT    /api/auth/update-profile    - Update profile
```

### Restaurant API Endpoints
```
GET    /api/tables                 - Get all tables
POST   /api/tables                 - Create table
PUT    /api/tables/:id             - Update table
DELETE /api/tables/:id             - Delete table

GET    /api/menu                   - Get menu items
POST   /api/menu                   - Create menu item
PUT    /api/menu/:id               - Update menu item
DELETE /api/menu/:id               - Delete menu item

GET    /api/orders                 - Get all orders
POST   /api/orders                 - Create order
PUT    /api/orders/:id             - Update order status
DELETE /api/orders/:id             - Cancel order

GET    /api/staff                  - Get staff members
POST   /api/staff                  - Add staff
PUT    /api/staff/:id              - Update staff
DELETE /api/staff/:id              - Remove staff
```

### Hotel API Endpoints
```
GET    /api/hotel/rooms            - Get available rooms
POST   /api/hotel/rooms            - Create room
PUT    /api/hotel/rooms/:id        - Update room
DELETE /api/hotel/rooms/:id        - Delete room

GET    /api/hotel/bookings         - Get all bookings
POST   /api/hotel/bookings         - Create booking
PUT    /api/hotel/bookings/:id     - Update booking
GET    /api/hotel/bookings/:id     - Get booking details

POST   /api/hotel/payments         - Process payment (Razorpay)
GET    /api/hotel/payments/:id     - Get payment status

GET    /api/hotel/reviews          - Get room reviews
POST   /api/hotel/reviews          - Submit review
```

### WebSocket Events
```
join-room                          - Join a real-time notification room
order-updated                      - Order status change
table-updated                      - Table status change
booking-confirmed                  - Booking confirmation
payment-processed                  - Payment completion
```

## ⚙️ Environment Configuration

### Essential Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend server port | `5000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `hotel_restaurant_db` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `JWT_SECRET` | JWT signing key | `your_secret_key` |
| `NODE_ENV` | Environment mode | `development` or `production` |

### Third-Party Integrations

**Nodemailer (Email)**
- Requires Gmail app-specific password or SMTP credentials

**Twilio (SMS)**
- Requires account SID and auth token
- Used for SMS notifications to guests

**Razorpay (Payments)**
- Requires merchant key ID and secret
- Used for online payment processing

## 🗄️ Database Setup

The database is initialized automatically during setup:

```bash
cd backend
npm run seed
```

This creates:
- Database schema with all required tables
- Admin user accounts
- Initial menu items
- Sample data for development

### Database Tables
- Users (restaurant staff)
- Hotel Users (hotel staff and guests)
- Tables (restaurant seating)
- Menu Items
- Orders
- Order Items
- Rooms (hotel)
- Bookings (hotel)
- Reviews (hotel)
- Payments
- Staff

## 🐛 Troubleshooting

### Issue: Database connection error
**Solution**: 
- Verify PostgreSQL is running
- Check credentials in `.env` file
- Run `npm run seed` to initialize database

### Issue: CORS errors
**Solution**:
- Ensure backend is running on port 5000
- Check frontend ports match configuration (5173, 5174, 5175, 5180, 5181)
- Verify `CORS` allowed origins in `backend/src/index.js`

### Issue: WebSocket connection fails
**Solution**:
- Ensure Socket.IO is initialized in backend
- Check browser console for connection errors
- Verify firewall doesn't block WebSocket connections

### Issue: JWT authentication fails
**Solution**:
- Ensure `JWT_SECRET` is set in `.env`
- Check token expiration time
- Verify Bearer token format: `Authorization: Bearer <token>`

### Issue: Email notifications not sending
**Solution**:
- Verify email credentials in `.env`
- For Gmail, use app-specific password
- Enable "Less secure app access" if needed
- Check spam/junk folder

### Issue: Port already in use
**Solution**:
```bash
# Find and kill process using the port
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

## 📝 Common Commands

```bash
# Start backend development
cd backend && npm run dev

# Start specific frontend
cd admin-dashboard && npm run dev

# Build for production
npm run build

# Seed database
cd backend && npm run seed

# Check database connection
cd backend && node test_db.js

# Test API endpoints
cd backend && node test_api.js
```

## 🔐 Security Considerations

- All passwords are hashed using bcryptjs
- JWT tokens used for API authentication
- CORS configured for allowed origins only
- Environment variables for sensitive data
- Input validation on all endpoints
- Rate limiting recommended for production
- HTTPS recommended for production deployment

## 📞 Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review error logs in the terminal
3. Check browser console for frontend errors
4. Verify database connection and migrations
5. Ensure all environment variables are set correctly

## 📄 License

ISC

## 👥 Development Team

Antigravity

---

**Last Updated**: June 2026

For more information or contributions, please contact the development team.
