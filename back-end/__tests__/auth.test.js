const request = require('supertest');
const app = require('../servers');
const dbHelper = require('./dbHelper');
const User = require('../models/User');
const { issueRegisterToken } = require('../utils/otpStore');

beforeAll(async () => {
  await dbHelper.connect();
});

afterAll(async () => {
  await dbHelper.close();
});

beforeEach(async () => {
  await dbHelper.clear();
});

describe('Back-End Authentication Integration Tests', () => {
  const mockPhone = '+2250707070707'; // Ivory Coast phone format
  const mockUser = {
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    password: 'SuperSecurePassword123!',
    phoneE164: mockPhone,
  };

  describe('POST /api/auth/register', () => {
    it('should reject registration if name, email or password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: mockUser.email,
          password: mockUser.password,
          phoneE164: mockPhone,
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Nom, email et mot de passe requis.');
    });

    it('should reject registration if phone token is invalid or missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: mockUser.name,
          email: mockUser.email,
          password: mockUser.password,
          phoneE164: mockPhone,
          phoneVerificationToken: 'invalid_token_123',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Vérification téléphone invalide ou expirée. Renvoyez un code.');
    });

    it('should register user successfully with valid verification token', async () => {
      const token = issueRegisterToken(mockPhone);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...mockUser,
          phoneVerificationToken: token,
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Compte créé.');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('name', mockUser.name);
      expect(response.body.user).toHaveProperty('email', mockUser.email);
      expect(response.body.user).toHaveProperty('phoneE164', mockPhone);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify user is in database
      const dbUser = await User.findOne({ email: mockUser.email });
      expect(dbUser).toBeTruthy();
      expect(dbUser.phoneVerified).toBe(true);
    });

    it('should reject registration if email is already taken', async () => {
      const token1 = issueRegisterToken(mockPhone);
      await request(app)
        .post('/api/auth/register')
        .send({
          ...mockUser,
          phoneVerificationToken: token1,
        })
        .expect(201);

      const token2 = issueRegisterToken('+2250808080808');
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...mockUser,
          email: mockUser.email,
          phoneE164: '+2250808080808',
          phoneVerificationToken: token2,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Un compte existe déjà avec cet email.');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const token = issueRegisterToken(mockPhone);
      await request(app)
        .post('/api/auth/register')
        .send({
          ...mockUser,
          phoneVerificationToken: token,
        })
        .expect(201);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: mockUser.password,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Connexion réussie.');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', mockUser.email);
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: mockUser.email,
          password: 'WrongPassword!',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Email ou mot de passe incorrect.');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeEach(async () => {
      const token = issueRegisterToken(mockPhone);
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...mockUser,
          phoneVerificationToken: token,
        })
        .expect(201);
      
      authToken = res.body.token;
    });

    it('should return user info when authorized', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', mockUser.email);
    });

    it('should deny access when unauthorized', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });
  });
});
