const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/hotelEmailService');
require('dotenv').config();

// Helpers
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password || !phone) {
    return res.status(400).json({ error: 'Please provide name, email, password, and phone number.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if user already exists
    const userCheck = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      const existingUser = userCheck.rows[0];
      if (existingUser.is_verified) {
        return res.status(400).json({ error: 'An account with this email address already exists.' });
      } else {
        // Clear unverified duplicate to allow fresh signup
        await client.query('DELETE FROM otp_verifications WHERE email = $1', [email]);
        await client.query('DELETE FROM users WHERE email = $1', [email]);
      }
    }

    // 2. Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create User (marked is_verified = false, role = 'customer')
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone_number, is_verified)
       VALUES ($1, $2, $3, 'customer', $4, FALSE) RETURNING id, name, email`,
      [name, email, passwordHash, phone]
    );
    const user = userResult.rows[0];

    // 4. Generate 6-digit OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // 5. Store OTP
    await client.query(
      `INSERT INTO otp_verifications (email, otp, expires_at, is_verified)
       VALUES ($1, $2, $3, FALSE)`,
      [email, otp, expiresAt]
    );

    // 6. Send OTP Email
    await emailService.sendOtpEmail(email, otp);

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Signup successful! Please check your email for the verification code.',
      user
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Signup Error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to complete signup.' });
  } finally {
    client.release();
  }
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Please provide email and verification code.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch OTP record
    const otpResult = await client.query(
      `SELECT * FROM otp_verifications 
       WHERE email = $1 AND otp = $2 AND is_verified = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    const otpRecord = otpResult.rows[0];

    // 2. Check Expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // 3. Mark OTP as verified
    await client.query(
      `UPDATE otp_verifications SET is_verified = TRUE WHERE id = $1`,
      [otpRecord.id]
    );

    // 4. Mark User as verified
    await client.query(
      `UPDATE users SET is_verified = TRUE WHERE email = $1`,
      [email]
    );

    await client.query('COMMIT');
    res.json({ message: 'OTP verified successfully! You can now log in.' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('OTP Verification Error:', error.message);
    res.status(500).json({ error: 'Verification failed.' });
  } finally {
    client.release();
  }
};

const resendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Please provide email address.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user exists and is unverified
    const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    if (userResult.rows[0].is_verified) {
      return res.status(400).json({ error: 'Account is already verified. Please log in.' });
    }

    // Rate limiting check: prevent spamming resend within 30s
    const lastOtpResult = await client.query(
      `SELECT * FROM otp_verifications WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    if (lastOtpResult.rows.length > 0) {
      const elapsed = Date.now() - new Date(lastOtpResult.rows[0].created_at).getTime();
      if (elapsed < 30 * 1000) {
        return res.status(429).json({ error: 'Please wait 30 seconds before requesting another code.' });
      }
    }

    // Generate new OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await client.query(
      `INSERT INTO otp_verifications (email, otp, expires_at, is_verified)
       VALUES ($1, $2, $3, FALSE)`,
      [email, otp, expiresAt]
    );

    await emailService.sendOtpEmail(email, otp);

    await client.query('COMMIT');
    res.json({ message: 'Verification code resent successfully!' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Resend OTP Error:', error.message);
    res.status(500).json({ error: 'Failed to resend code.' });
  } finally {
    client.release();
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password.' });
  }

  try {
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const user = userResult.rows[0];

    // Check OTP verification status
    if (user.role === 'customer' && !user.is_verified) {
      return res.status(403).json({ 
        error: 'Your email address is unverified.', 
        unverified: true, 
        email: user.email 
      });
    }

    // Verify Password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'supersecretrestaurantjwttokenkey123!',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone_number
      }
    });

  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ error: 'Failed to log in.' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Please provide email address.' });
  }

  try {
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'No account associated with this email address.' });
    }

    // Simulate password reset request by generating a JWT reset token (expires in 15 mins)
    const resetToken = jwt.sign(
      { email },
      process.env.JWT_SECRET || 'supersecretrestaurantjwttokenkey123!',
      { expiresIn: '15m' }
    );

    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
    await emailService.sendPasswordReset(email, resetUrl);

    res.json({ message: 'Password reset link sent! Please check your email inbox.' });

  } catch (error) {
    console.error('Forgot Password Error:', error.message);
    res.status(500).json({ error: 'Failed to send reset link.' });
  }
};

const updateProfile = async (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Please provide name and phone number.' });
  }

  try {
    const result = await db.query(
      `UPDATE users 
       SET name = $1, phone_number = $2 
       WHERE id = $3 
       RETURNING id, name, email, role, phone_number`,
      [name.trim(), phone.trim(), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const updatedUser = result.rows[0];
    res.json({
      message: 'Profile updated successfully!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone_number
      }
    });

  } catch (error) {
    console.error('Update Profile Error:', error.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  updateProfile,
};
