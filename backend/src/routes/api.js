const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const hotelAuthController = require('../controllers/hotelAuthController');
const tableController = require('../controllers/tableController');
const menuController = require('../controllers/menuController');
const orderController = require('../controllers/orderController');
const staffController = require('../controllers/staffController');

const { authenticateToken, verifyRole } = require('../middleware/auth');

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================
router.post('/auth/register', authController.register); // Public — waiter/kitchen self-registration
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.getMe);
router.post('/contact', hotelAuthController.submitContactQuery);

// ==========================================
// 2. TABLE MANAGEMENT ROUTES
// ==========================================
router.get('/tables', authenticateToken, tableController.getTables);
router.post('/tables', authenticateToken, verifyRole(['admin']), tableController.createTable);
router.put('/tables/:id', authenticateToken, verifyRole(['admin']), tableController.updateTable);
router.delete('/tables/:id', authenticateToken, verifyRole(['admin']), tableController.deleteTable);

// ==========================================
// 3. MENU MANAGEMENT ROUTES
// ==========================================
router.get('/menu', authenticateToken, menuController.getMenu);
router.post('/menu', authenticateToken, verifyRole(['admin']), menuController.createMenuItem);
router.put('/menu/:id', authenticateToken, verifyRole(['admin']), menuController.updateMenuItem);
router.delete('/menu/:id', authenticateToken, verifyRole(['admin']), menuController.deleteMenuItem);

// ==========================================
// 4. ORDER TRANSACTIONS ROUTES
// ==========================================
router.post('/orders', authenticateToken, verifyRole(['waiter', 'admin']), orderController.placeOrder);
router.get('/orders/active', authenticateToken, orderController.getActiveOrders);
router.get('/orders/:id/receipt', orderController.getOrderReceipt); // Public for receipt lookup
router.put('/orders/:id/status', authenticateToken, verifyRole(['waiter', 'kitchen', 'admin']), orderController.updateOrderStatus);
router.post('/orders/:id/send-whatsapp', authenticateToken, verifyRole(['waiter', 'admin']), orderController.sendWhatsAppBillManual);
router.post('/orders/:id/simulate-payment', orderController.simulatePaymentSuccess); // Public for mock gateway webhook

// ==========================================
// 5. STAFF & ATTENDANCE ROUTES
// ==========================================
// Clock-in/out & Attendance logs
router.post('/staff/clock-in', authenticateToken, staffController.clockIn);
router.post('/staff/clock-out', authenticateToken, staffController.clockOut);
router.get('/staff/attendance', authenticateToken, staffController.getAttendanceHistory);

// KPI dashboard stats
router.get('/staff/performance', authenticateToken, verifyRole(['admin']), staffController.getStaffPerformance);

// Roster CRUD
router.get('/staff', authenticateToken, verifyRole(['admin']), staffController.getStaff);
router.post('/staff', authenticateToken, verifyRole(['admin']), staffController.createStaff);
router.put('/staff/:id', authenticateToken, verifyRole(['admin']), staffController.updateStaff);
router.delete('/staff/:id', authenticateToken, verifyRole(['admin']), staffController.deleteStaff);

module.exports = router;
