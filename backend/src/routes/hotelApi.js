const express = require('express');
const router = express.Router();

const auth = require('../controllers/hotelAuthController');
const rooms = require('../controllers/hotelRoomController');
const bookings = require('../controllers/hotelBookingController');
const payments = require('../controllers/hotelPaymentController');
const reviews = require('../controllers/hotelReviewController');
const admin = require('../controllers/hotelAdminController');

const { authenticateHotelToken, verifyHotelRole } = require('../middleware/hotelAuth');

// ==========================================
// 1. AUTHENTICATION & OTP ROUTES
// ==========================================
router.post('/auth/register', auth.register);
router.post('/auth/verify-otp', auth.verifyOtp);
router.post('/auth/resend-otp', auth.resendOtp);
router.post('/auth/login', auth.login);
router.post('/auth/forgot-password', auth.forgotPassword);
router.put('/auth/profile', authenticateHotelToken, auth.updateProfile);

// ==========================================
// 2. ROOM CATALOG ROUTES
// ==========================================
router.get('/rooms', rooms.getRooms);
router.get('/rooms/:id', rooms.getRoomById);
router.post('/rooms', authenticateHotelToken, verifyHotelRole(['admin']), rooms.createRoom);
router.put('/rooms/:id', authenticateHotelToken, verifyHotelRole(['admin']), rooms.updateRoom);
router.delete('/rooms/:id', authenticateHotelToken, verifyHotelRole(['admin']), rooms.deleteRoom);

// ==========================================
// 3. BOOKINGS MANAGEMENT ROUTES
// ==========================================
router.post('/bookings', authenticateHotelToken, verifyHotelRole(['customer', 'admin']), bookings.placeBooking);
router.get('/bookings/my-bookings', authenticateHotelToken, verifyHotelRole(['customer', 'admin']), bookings.getMyBookings);
router.put('/bookings/cancel/:id', authenticateHotelToken, bookings.cancelBooking);
router.put('/bookings/:id', authenticateHotelToken, bookings.updateBookingDetails);
router.delete('/bookings/:id', authenticateHotelToken, bookings.deleteBooking);
router.get('/bookings', authenticateHotelToken, verifyHotelRole(['admin']), bookings.manageAllBookings);
router.put('/bookings/:id/status', authenticateHotelToken, verifyHotelRole(['admin']), bookings.updateBookingStatus);
router.put('/bookings/:id/payment', authenticateHotelToken, verifyHotelRole(['admin']), bookings.updateBookingPaymentStatus);

// ==========================================
// 4. CHECKOUT PAYMENTS ROUTES
// ==========================================
router.post('/payments/create-order', authenticateHotelToken, payments.createPaymentOrder);
router.post('/payments/verify', authenticateHotelToken, payments.verifyPayment);

// ==========================================
// 5. ROOM REVIEWS ROUTES
// ==========================================
router.post('/reviews', authenticateHotelToken, verifyHotelRole(['customer', 'admin']), reviews.submitReview);
router.get('/reviews/:room_id', reviews.getRoomReviews);

// ==========================================
// 6. ADMIN DASHBOARD STATS ROUTES
// ==========================================
router.get('/admin/stats', authenticateHotelToken, verifyHotelRole(['admin']), admin.getStats);
router.get('/admin/users', authenticateHotelToken, verifyHotelRole(['admin']), admin.getUsers);
router.put('/admin/users/:id', authenticateHotelToken, verifyHotelRole(['admin']), admin.updateUser);
router.delete('/admin/users/:id', authenticateHotelToken, verifyHotelRole(['admin']), admin.deleteUser);

module.exports = router;
