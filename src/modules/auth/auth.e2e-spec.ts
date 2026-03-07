import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma';

type RegisterResponseBody = {
  user?: {
    id?: unknown;
    email?: unknown;
    emailVerifiedAt?: unknown;
  };
  next?: {
    action?: unknown;
  };
};

type LoginResponseBody = {
  accessToken?: unknown;
};

type MeResponseBody = {
  user?: {
    id?: unknown;
    email?: unknown;
  };
};

function getUserIdFromRegister(body: unknown): string {
  const typedBody = body as RegisterResponseBody;
  if (typeof typedBody.user?.id !== 'string') {
    throw new Error('Missing user.id in register response');
  }
  return typedBody.user.id;
}

function getAccessToken(body: unknown): string {
  const typedBody = body as LoginResponseBody;
  if (typeof typedBody.accessToken !== 'string') {
    throw new Error('Missing accessToken in response body');
  }
  return typedBody.accessToken;
}

function getCookieFromHeaders(setCookieHeader: unknown): string {
  if (
    !Array.isArray(setCookieHeader) ||
    typeof setCookieHeader[0] !== 'string'
  ) {
    throw new Error('Missing set-cookie header');
  }

  const firstCookie = setCookieHeader[0];
  const cookieValue = firstCookie.split(';')[0];
  if (!cookieValue.startsWith('cb_refresh=')) {
    throw new Error('Missing cb_refresh cookie');
  }

  return cookieValue;
}

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const testEmail = `auth-test-${Date.now()}@example.com`;
  const testPassword = `Aa!${Date.now()}z`;

  let userId = '';
  let accessToken = '';
  let refreshCookie = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  }, 30000);

  afterAll(async () => {
    if (userId) {
      try {
        await prisma.block.deleteMany({ where: { page: { userId } } });
        await prisma.page.deleteMany({ where: { userId } });
        await prisma.passwordReset.deleteMany({ where: { userId } });
        await prisma.refreshToken.deleteMany({ where: { userId } });
        await prisma.verificationCode.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      } catch {
        // Best-effort cleanup in test teardown.
      }
    }

    await app.close();
  });

  it('POST /api/v1/auth/register should create user and require verification', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: testPassword })
      .expect(201);

    userId = getUserIdFromRegister(response.body);
    expect(response.body).toHaveProperty('next.action', 'VERIFY_EMAIL_CODE');
  });

  it('POST /api/v1/auth/register should reject duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: testPassword })
      .expect(409);
  });

  it('POST /api/v1/auth/login should fail before email verification', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(403);
  });

  it('POST /api/v1/auth/verify-email should fail with invalid code', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email: testEmail, code: '000000' })
      .expect(400);
  });

  it('POST /api/v1/auth/verify-email should verify with valid code', async () => {
    const latestCode = await prisma.verificationCode.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestCode) {
      throw new Error('No verification code found for test user');
    }

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email: testEmail, code: latestCode.code })
      .expect(200);

    expect(response.body).toHaveProperty('status', 'VERIFIED');
  });

  it('POST /api/v1/auth/login should return access token and refresh cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    accessToken = getAccessToken(response.body);
    refreshCookie = getCookieFromHeaders(response.headers['set-cookie']);
  });

  it('GET /api/v1/me should return current user with bearer token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const typedBody = response.body as MeResponseBody;
    expect(typedBody.user?.id).toBe(userId);
    expect(typedBody.user?.email).toBe(testEmail.toLowerCase());
  });

  it('POST /api/v1/auth/refresh should rotate token from cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    accessToken = getAccessToken(response.body);
    refreshCookie = getCookieFromHeaders(response.headers['set-cookie']);
  });

  it('POST /api/v1/auth/logout should clear refresh cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie)
      .expect(204);

    const setCookieHeader = response.headers['set-cookie'];
    if (
      !Array.isArray(setCookieHeader) ||
      typeof setCookieHeader[0] !== 'string'
    ) {
      throw new Error('Missing clear-cookie header on logout');
    }

    expect(setCookieHeader[0]).toContain('cb_refresh=');
  });

  it('POST /api/v1/auth/password/forgot should return SENT for existing user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/password/forgot')
      .send({ email: testEmail })
      .expect(200);

    expect(response.body).toHaveProperty('status', 'SENT');
  });

  it('POST /api/v1/auth/password/forgot should return SENT for unknown user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/password/forgot')
      .send({ email: `unknown-${Date.now()}@example.com` })
      .expect(200);

    expect(response.body).toHaveProperty('status', 'SENT');
  });
});
