import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Auth + core flow (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  // Unique per test run, prevents collisions with previously seeded users.
  const tag = `e2e_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const adminUsername = `${tag}_admin`;
  const devUsername = `${tag}_dev`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects protected routes when no token is provided', async () => {
    await request(server).get('/users').expect(401);
    await request(server).get('/projects').expect(401);
    await request(server).get('/audit-logs').expect(401);
  });

  it('walks create-user -> login -> create-project -> create-ticket', async () => {
    // public POST /users
    const userRes = await request(server)
      .post('/users')
      .send({
        username: adminUsername,
        email: `${adminUsername}@x.com`,
        fullName: 'E2E Admin',
        role: 'ADMIN',
        password: 'secret123',
      })
      .expect(200);
    expect(userRes.body.id).toEqual(expect.any(Number));
    expect(userRes.body.passwordHash).toBeUndefined();

    // public POST /auth/login
    const loginRes = await request(server)
      .post('/auth/login')
      .send({ username: adminUsername, password: 'secret123' })
      .expect(200);
    expect(loginRes.body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
    const token: string = loginRes.body.accessToken;
    expect(token).toEqual(expect.any(String));

    // protected POST /projects requires the token
    await request(server)
      .post('/projects')
      .send({ name: `P_${tag}`, ownerId: userRes.body.id })
      .expect(401);

    const projectRes = await request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `P_${tag}`, ownerId: userRes.body.id })
      .expect(200);
    expect(projectRes.body.id).toEqual(expect.any(Number));
    expect(projectRes.body.deletedAt).toBeUndefined();

    // protected POST /tickets
    const ticketRes = await request(server)
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'e2e ticket',
        priority: 'HIGH',
        type: 'BUG',
        projectId: projectRes.body.id,
      })
      .expect(200);
    expect(ticketRes.body.id).toEqual(expect.any(Number));
    expect(ticketRes.body.status).toBe('TODO');
    expect(ticketRes.body.deletedAt).toBeUndefined();
  });

  it('returns 403 for a DEVELOPER token on an ADMIN-only endpoint', async () => {
    await request(server)
      .post('/users')
      .send({
        username: devUsername,
        email: `${devUsername}@x.com`,
        fullName: 'E2E Dev',
        role: 'DEVELOPER',
        password: 'secret123',
      })
      .expect(200);

    const devLogin = await request(server)
      .post('/auth/login')
      .send({ username: devUsername, password: 'secret123' })
      .expect(200);
    const devToken: string = devLogin.body.accessToken;

    await request(server)
      .get('/projects/deleted')
      .set('Authorization', `Bearer ${devToken}`)
      .expect(403);
  });
});
