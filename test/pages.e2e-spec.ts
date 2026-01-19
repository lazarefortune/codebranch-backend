import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma';
import * as argon2 from 'argon2';

describe('PagesController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = 'pages-test-' + Date.now() + '@example.com';
  const testUser = { email: testEmail, password: 'TestPassword123!' };
  let accessToken: string;
  let createdPageId: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await argon2.hash(testUser.password);
    const user = await prisma.user.create({ data: { email: testUser.email.toLowerCase(), passwordHash, emailVerifiedAt: new Date() } });
    testUserId = user.id;

    const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send(testUser);
    if (loginResponse.status !== 200) {
      throw new Error('Login failed: ' + JSON.stringify(loginResponse.body));
    }
    accessToken = loginResponse.body.accessToken;
  }, 30000);

  afterAll(async () => {
    try {
      await prisma.block.deleteMany({ where: { page: { userId: testUserId } } });
      await prisma.page.deleteMany({ where: { userId: testUserId } });
      await prisma.refreshToken.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    } catch (e) {}
    await app.close();
  });

  describe('POST /api/v1/pages', () => {
    it('should create a new page', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/pages').set('Authorization', 'Bearer ' + accessToken).send({ isPublic: false }).expect(201);
      expect(response.body).toHaveProperty('page');
      createdPageId = response.body.page.id;
    });

    it('should fail without auth', async () => {
      await request(app.getHttpServer()).post('/api/v1/pages').send({ isPublic: false }).expect(401);
    });
  });

  describe('GET /api/v1/pages', () => {
    it('should return pages list', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/pages').set('Authorization', 'Bearer ' + accessToken).expect(200);
      expect(response.body).toHaveProperty('pages');
    });

    it('should fail without auth', async () => {
      await request(app.getHttpServer()).get('/api/v1/pages').expect(401);
    });
  });

  describe('GET /api/v1/pages/:pageId', () => {
    it('should return page', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/pages/' + createdPageId).set('Authorization', 'Bearer ' + accessToken).expect(200);
      expect(response.body).toHaveProperty('page');
    });

    it('should return 404 for non-existent page', async () => {
      await request(app.getHttpServer()).get('/api/v1/pages/non-existent-id').set('Authorization', 'Bearer ' + accessToken).expect(404);
    });
  });

  describe('DELETE/api/v1/pages/:pageId', () => {
    it('should delete the page', async () => {
      await request(app.getHttpServer()).delete('/api/v1/pages/' + createdPageId).set('Authorization', 'Bearer ' + accessToken).expect(204);
    });

    it('should return 404 for non-existent page', async () => {
      await request(app.getHttpServer()).delete('/api/v1/pages/' + createdPageId).set('Authorization', 'Bearer ' + accessToken).expect(404);
    });
  });
});