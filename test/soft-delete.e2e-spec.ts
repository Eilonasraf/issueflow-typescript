import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Soft delete lifecycle (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  const tag = `soft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  let token: string;
  let userId: number;
  let projectId: number;
  let ticketId: number;

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

    const userRes = await request(server)
      .post('/users')
      .send({
        username: tag,
        email: `${tag}@x.com`,
        fullName: 'Soft Tester',
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
      .send({ name: `SoftP_${tag}`, ownerId: userId })
      .expect(200);
    projectId = projRes.body.id;

    const ticketRes = await request(server)
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `soft ticket ${tag}`,
        priority: 'LOW',
        type: 'BUG',
        projectId,
      })
      .expect(200);
    ticketId = ticketRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('hides soft-deleted ticket from standard list, surfaces it under /deleted, and restores it', async () => {
    // 1. ticket is in the standard list
    let list = await request(server)
      .get(`/tickets?projectId=${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.map((t: { id: number }) => t.id)).toContain(ticketId);

    // 2. soft-delete it
    await request(server)
      .delete(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // 3. it's hidden from the standard list (the §3.5 headline claim)
    list = await request(server)
      .get(`/tickets?projectId=${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.map((t: { id: number }) => t.id)).not.toContain(ticketId);

    // 4. it IS in the /deleted list (ADMIN-only — our token is ADMIN)
    const deleted = await request(server)
      .get(`/tickets/deleted?projectId=${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(deleted.body.map((t: { id: number }) => t.id)).toContain(ticketId);

    // 5. restore it
    await request(server)
      .post(`/tickets/${ticketId}/restore`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // 6. it's back in the standard list
    list = await request(server)
      .get(`/tickets?projectId=${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.map((t: { id: number }) => t.id)).toContain(ticketId);

    // 7. and no longer in /deleted
    const deletedAfter = await request(server)
      .get(`/tickets/deleted?projectId=${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(deletedAfter.body.map((t: { id: number }) => t.id)).not.toContain(
      ticketId,
    );
  });
});
