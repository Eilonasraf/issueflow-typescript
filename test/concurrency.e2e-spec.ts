import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Optimistic locking (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  const tag = `lock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  let token: string;
  let userId: number;
  let projectId: number;

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

    // bootstrap user / token / project
    const userRes = await request(server)
      .post('/users')
      .send({
        username: tag,
        email: `${tag}@x.com`,
        fullName: 'Lock User',
        role: 'ADMIN',
        password: 'secret123',
      })
      .expect(200);
    userId = userRes.body.id;

    const loginRes = await request(server)
      .post('/auth/login')
      .send({ username: tag, password: 'secret123' })
      .expect(200);
    token = loginRes.body.accessToken;

    const projRes = await request(server)
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `LockP_${tag}`, ownerId: userId })
      .expect(200);
    projectId = projRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('ticket: PATCH with correct version succeeds, then stale version returns 409', async () => {
    const created = await request(server)
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'lock t',
        priority: 'HIGH',
        type: 'BUG',
        projectId,
      })
      .expect(200);
    const ticketId = created.body.id;
    expect(created.body.version).toEqual(expect.any(Number));
    const firstVersion = created.body.version;

    await request(server)
      .patch(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ version: firstVersion, title: 'lock t v2' })
      .expect(200);

    // re-fetch and confirm version advanced
    const reread = await request(server)
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(reread.body.version).toBeGreaterThan(firstVersion);

    // second PATCH with the OLD version → 409
    const stale = await request(server)
      .patch(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ version: firstVersion, title: 'lock t v3' })
      .expect(409);
    expect(stale.body.message).toMatch(/modified by another user/i);
  });

  it('comment: PATCH with correct version succeeds, then stale version returns 409', async () => {
    const ticket = await request(server)
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'lock c parent',
        priority: 'LOW',
        type: 'BUG',
        projectId,
      })
      .expect(200);

    const commentRes = await request(server)
      .post(`/tickets/${ticket.body.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ authorId: userId, content: 'hello' })
      .expect(200);
    expect(commentRes.body.version).toEqual(expect.any(Number));
    const commentId = commentRes.body.id;
    const firstVersion = commentRes.body.version;

    await request(server)
      .patch(`/tickets/${ticket.body.id}/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ version: firstVersion, content: 'edited' })
      .expect(200);

    const list = await request(server)
      .get(`/tickets/${ticket.body.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const updated = list.body.find((c: { id: number }) => c.id === commentId);
    expect(updated.version).toBeGreaterThan(firstVersion);

    const stale = await request(server)
      .patch(`/tickets/${ticket.body.id}/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ version: firstVersion, content: 'edited again' })
      .expect(409);
    expect(stale.body.message).toMatch(/modified by another user/i);
  });
});
