const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../servers');
const dbHelper = require('./dbHelper');
const User = require('../models/User');
const { setEmailOtp } = require('../utils/otpStore');

beforeAll(async () => {
  await dbHelper.connect();
});

afterAll(async () => {
  await dbHelper.close();
});

beforeEach(async () => {
  await dbHelper.clear();
});

describe('Forgot password', () => {
  const email = 'reset.user@example.com';
  const password = 'OldPassword1!';
  const phone = '+2250707070710';

  beforeEach(async () => {
    await User.create({
      name: 'Reset User',
      email,
      password: await bcrypt.hash(password, 10),
      phoneE164: phone,
      phoneVerified: true,
    });
  });

  describe('POST /api/auth/forgot-password/send', () => {
    it('returns ok for unknown email without revealing absence', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/send')
        .send({ email: 'unknown@example.com' })
        .expect(200);
      expect(res.body.ok).toBe(true);
    });

    it('sends mock code for existing user when no mail provider', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/send')
        .send({ email })
        .expect(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.mock).toBe(true);
      expect(res.body.devOtp).toMatch(/^\d{6}$/);
    });
  });

  describe('POST /api/auth/forgot-password/verify + reset', () => {
    it('resets password with valid code flow', async () => {
      const code = '654321';
      setEmailOtp(email, code);

      const verifyRes = await request(app)
        .post('/api/auth/forgot-password/verify')
        .send({ email, code })
        .expect(200);

      expect(verifyRes.body.resetToken).toBeTruthy();

      await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({
          email,
          resetToken: verifyRes.body.resetToken,
          newPassword: 'NewPassword9!',
        })
        .expect(200);

      const loginOld = await request(app)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(401);

      expect(loginOld.body.error).toMatch(/incorrect/i);

      const loginNew = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'NewPassword9!' })
        .expect(200);

      expect(loginNew.body.token).toBeTruthy();
    });
  });
});
