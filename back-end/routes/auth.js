const express = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/auth/authController');
const whatsappOtpController = require('../controllers/whatsappOtpController');
const forgotPasswordController = require('../controllers/forgotPasswordController');

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_OTP_WINDOW_MS || 10 * 60 * 1000),
  limit: Number(process.env.RATE_LIMIT_OTP_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives OTP. Réessaie plus tard.' },
});

const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 10 * 60 * 1000),
  limit: Number(process.env.RATE_LIMIT_AUTH_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessaie plus tard.' },
});

router.post(
  '/whatsapp-otp/validate-phone',
  otpLimiter,
  asyncHandler(whatsappOtpController.validatePhone)
);
router.post('/whatsapp-otp/send', otpLimiter, asyncHandler(whatsappOtpController.sendOtp));
router.post('/whatsapp-otp/verify', otpLimiter, asyncHandler(whatsappOtpController.verifyOtp));

router.post('/forgot-password/send', otpLimiter, asyncHandler(forgotPasswordController.sendResetCode));
router.post('/forgot-password/verify', otpLimiter, asyncHandler(forgotPasswordController.verifyResetCode));
router.post('/forgot-password/reset', authLimiter, asyncHandler(forgotPasswordController.resetPassword));

router.get('/me', requireAuth, asyncHandler(authController.me));

// POST /api/auth/register
router.post('/register', authLimiter, asyncHandler(authController.register));

// POST /api/auth/login
router.post('/login', authLimiter, asyncHandler(authController.login));

module.exports = router;
