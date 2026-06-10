const request = require('supertest');
const app = require('../servers');
const dbHelper = require('./dbHelper');
const User = require('../models/User');

beforeAll(async () => {
  await dbHelper.connect();
});

afterAll(async () => {
  await dbHelper.close();
});

beforeEach(async () => {
  await dbHelper.clear();
});

describe('OTP & Phone Validation Endpoints', () => {
  const mockPhone = '+2250707070707';
  const mockEmail = 'jean.dupont@example.com';

  describe('POST /api/auth/whatsapp-otp/validate-phone', () => {
    it('should validate valid phone number and check that it is not taken', async () => {
      const response = await request(app)
        .post('/api/auth/whatsapp-otp/validate-phone')
        .send({ phoneE164: mockPhone })
        .expect(200);

      expect(response.body).toEqual({ ok: true, phoneE164: mockPhone });
    });

    it('should reject invalid phone numbers', async () => {
      await request(app)
        .post('/api/auth/whatsapp-otp/validate-phone')
        .send({ phoneE164: '123' })
        .expect(400);
    });

    it('should reject if phone number is already registered', async () => {
      // Create user
      await User.create({
        name: 'Existing User',
        email: mockEmail,
        password: 'Password123!',
        phoneE164: mockPhone,
        phoneVerified: true,
      });

      const response = await request(app)
        .post('/api/auth/whatsapp-otp/validate-phone')
        .send({ phoneE164: mockPhone })
        .expect(409);

      expect(response.body).toHaveProperty('code', 'PHONE_TAKEN');
    });
  });

  describe('POST /api/auth/whatsapp-otp/send', () => {
    it('should send email OTP if email is provided in body', async () => {
      const response = await request(app)
        .post('/api/auth/whatsapp-otp/send')
        .send({ phoneE164: '+2250707070701', email: mockEmail })
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('mock', true);
      expect(response.body).toHaveProperty('devOtp');
      expect(response.body.devOtp).toMatch(/^\d{6}$/);
    });

    it('should send WhatsApp OTP if no email is provided', async () => {
      const response = await request(app)
        .post('/api/auth/whatsapp-otp/send')
        .send({ phoneE164: '+2250707070702' })
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('mock', true);
      expect(response.body).toHaveProperty('devOtp');
    });

    it('should reject if email is invalid', async () => {
      await request(app)
        .post('/api/auth/whatsapp-otp/send')
        .send({ phoneE164: '+2250707070703', email: 'invalid-email' })
        .expect(400);
    });

    it('should reject if email is already taken', async () => {
      await User.create({
        name: 'Existing Email',
        email: mockEmail,
        password: 'Password123!',
        phoneE164: '+2250808080808',
        phoneVerified: true,
      });

      const response = await request(app)
        .post('/api/auth/whatsapp-otp/send')
        .send({ phoneE164: '+2250707070704', email: mockEmail })
        .expect(409);

      expect(response.body).toHaveProperty('code', 'EMAIL_TAKEN');
    });
  });

  describe('POST /api/auth/whatsapp-otp/verify', () => {
    it('should verify OTP and return a registration token', async () => {
      const uniquePhone = '+2250707070705';
      // 1. Send OTP to trigger generation
      const sendRes = await request(app)
        .post('/api/auth/whatsapp-otp/send')
        .send({ phoneE164: uniquePhone, email: 'unique@example.com' })
        .expect(200);

      const otpCode = sendRes.body.devOtp;
      expect(otpCode).toBeTruthy();

      // 2. Verify OTP
      const verifyRes = await request(app)
        .post('/api/auth/whatsapp-otp/verify')
        .send({ phoneE164: uniquePhone, code: otpCode })
        .expect(200);

      expect(verifyRes.body).toHaveProperty('ok', true);
      expect(verifyRes.body).toHaveProperty('verificationToken');
    });

    it('should reject incorrect or expired OTP', async () => {
      await request(app)
        .post('/api/auth/whatsapp-otp/verify')
        .send({ phoneE164: '+2250707070706', code: '000000' })
        .expect(400);
    });
  });
});

