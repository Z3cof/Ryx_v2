const request = require('supertest');
const app = require('../servers');
const dbHelper = require('./dbHelper');
const User = require('../models/User');
const Quest = require('../models/Quest');
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

describe('Back-End RyxQuest Integration Tests', () => {
  const mockPhone = '+2250707070707';
  const mockUser = {
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    password: 'SuperSecurePassword123!',
    phoneE164: mockPhone,
  };

  let authToken;
  let userId;

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
    userId = res.body.user._id;
  });

  it('should initialize starter quests upon listing', async () => {
    const res = await request(app)
      .get(`/api/quests/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('quests');
    expect(res.body.quests.length).toBe(3);
    
    const titles = res.body.quests.map(q => q.title);
    expect(titles).toContain('Premier pas ⚡');
    expect(titles).toContain('Explorateur de budget');
    expect(titles).toContain('Gardien de l\'épargne');
  });

  it('should update log_expenses quest progress when adding expenses, but NOT incomes', async () => {
    // 1. Initialise the quests
    await request(app)
      .get(`/api/quests/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Verify quest starts with 0 currentValue
    let activeQuests = await Quest.find({ userId, status: 'active' });
    let logQuest = activeQuests.find(q => q.type === 'log_expenses');
    expect(logQuest.currentValue).toBe(0);

    // 2. Add an expense (type: 'out')
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId,
        title: 'Achat supermarché',
        amount: 5000,
        type: 'out',
        category: 'Alimentation',
      })
      .expect(201);

    // Verify the quest has updated to 1
    logQuest = await Quest.findOne({ _id: logQuest._id });
    expect(logQuest.currentValue).toBe(1);

    // 3. Add an income (type: 'in')
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId,
        title: 'Salaire',
        amount: 250000,
        type: 'in',
        category: 'Salaire',
      })
      .expect(201);

    // Verify the quest remains at 1 (since incomes are NOT expenses)
    logQuest = await Quest.findOne({ _id: logQuest._id });
    expect(logQuest.currentValue).toBe(1);
  });

  it('should update quest progress when transactions are deleted or updated', async () => {
    // 1. Initialise the quests
    await request(app)
      .get(`/api/quests/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    let activeQuests = await Quest.find({ userId, status: 'active' });
    let logQuest = activeQuests.find(q => q.type === 'log_expenses');
    expect(logQuest.currentValue).toBe(0);

    // 2. Add two expenses
    const resTx1 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId,
        title: 'Transaction 1',
        amount: 1000,
        type: 'out',
      })
      .expect(201);

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId,
        title: 'Transaction 2',
        amount: 2000,
        type: 'out',
      })
      .expect(201);

    logQuest = await Quest.findOne({ _id: logQuest._id });
    expect(logQuest.currentValue).toBe(2);

    // 3. Delete one transaction and verify count updates to 1
    await request(app)
      .delete(`/api/transactions/${resTx1.body.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    logQuest = await Quest.findOne({ _id: logQuest._id });
    expect(logQuest.currentValue).toBe(1);
  });
});
