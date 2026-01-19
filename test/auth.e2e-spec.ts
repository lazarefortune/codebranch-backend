import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = 'test-' + Date.now() + '@example.com';
  const testUser = { email: testEmail, password: 'TestPassword123!' };
  let verificationCode: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    try {
      const user = await prisma.user.findUnique({ where: { email: testUser.email.toLowerCase() } });
      if (user) {
        await prisma.verificationCode.deleteMany({ where: { userId: user.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
        await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch (e) {}
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send(testUser).expect(201);
      expect(response.body).toHaveProperty('user');
      const user = await prisma.user.findUnique({ where: { email: testUser.email.toLowerCase() } });
      if (user) {
        const codeRecord = await prisma.verificationCode.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
        if (codeRecord) verificationCode = codeRecord.code;
      }
    });
    it('should fail with duplicate email', async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send(testUser).expect(409);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should verify email', async () => {
      const response = await request(app.getHttpServer()).post('/auth/verify-email').send({ email: testUser.email, code: verificationCode }).expect(200);
      expect(response.body).toHaveProperty('status', 'VERIFIED');
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully', async () => {
      const response = await request(app.getHttpServer()).post('/auth/login').send(testUser).expect(200);
      expect(response.body).toHaveProperty('accessToken');
      accessToken = response.body.accessToken;
      const cookies = response.headers['set-cookie'];
      if (Array.isArray(cookies)) {
        const rc = cookies.find((c) => c.startsWith('cb_refresh='));
        if (rc) refreshToken = rc.split(';')[0].replace('cb_refresh=', '');
      }
      expect(refreshToken).toBeDefined();
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens', async () => {
      const response = await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', 'cb_refresh=' + refreshToken).expect(200);
      expect(response.body).toHaveProperty('accessToken');
      accessToken = response.body.accessToken;
    });
  });

  describe('POST /auth/password/forgot', () => {
    it('should return success', async () => {
      const response = await request(app.getHttpServer()).post('/auth/password/forgot').send({ email: testUser.email }).expect(200);
      expect(response.body).toHaveProperty('status', 'SENT');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout', async () => {
      await request(app.getHttpServer()).post('/auth/logout').set('Authorization', 'Bearer ' + accessToken).set('Cookie', 'cb_refresh=' + refreshToken).expect(204);
    });
  });
});
