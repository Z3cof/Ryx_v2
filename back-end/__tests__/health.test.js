const request = require('supertest');
const app = require('../servers');

describe('Back-End Health Check Endpoint', () => {
  it('GET /api/health should return 200 OK with correct JSON payload', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({
      ok: true,
      message: 'Back-end accessible',
    });
  });

  it('GET /non-existent-route should return 404', async () => {
    const response = await request(app)
      .get('/api/non-existent-route')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toEqual({
      error: 'Route non trouvée',
    });
  });
});
