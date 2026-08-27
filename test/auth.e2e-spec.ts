import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './utils/create-test-app';
import { extractCookie } from './utils/extract-cookie';
import { MailServiceMock } from './utils/mail-service.mock';
import { resetDatabase } from './utils/reset-database';

const STRONG_PASSWORD = 'Str0ng!Pass';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mail: MailServiceMock;

  beforeAll(async () => {
    ({ app, prisma, mail } = await createTestApp());
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  async function registerUser(email: string, username: string) {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: STRONG_PASSWORD, username })
      .expect(201);
    const code = mail.lastVerificationCode?.code;
    if (!code) throw new Error('verification code was not captured');
    return code;
  }

  async function registerAndVerifyUser(email: string, username: string) {
    const code = await registerUser(email, username);
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email, code })
      .expect(200);
    return { accessToken: res.body.accessToken as string };
  }

  describe('POST /auth/register', () => {
    it('creates a user and page, does not leak passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'codebranch@example.com',
          password: STRONG_PASSWORD,
          username: 'codebranch',
        })
        .expect(201);

      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.email).toBe('codebranch@example.com');
      expect(res.body.user.emailVerifiedAt).toBeNull();
      expect(res.body.next).toEqual({ action: 'VERIFY_EMAIL_CODE' });
      expect(mail.lastVerificationCode?.email).toBe('codebranch@example.com');
    });

    it('rejects a duplicate email with 409 EMAIL_ALREADY_EXISTS', async () => {
      await registerUser('dup-email@example.com', 'dupemailuser1');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'dup-email@example.com',
          password: STRONG_PASSWORD,
          username: 'dupemailuser2',
        })
        .expect(409);

      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('rejects a duplicate username with 409 USERNAME_TAKEN', async () => {
      await registerUser('user-a@example.com', 'sharedusername');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'user-b@example.com',
          password: STRONG_PASSWORD,
          username: 'sharedusername',
        })
        .expect(409);

      expect(res.body.error.code).toBe('USERNAME_TAKEN');
    });

    it('rejects a weak password with 400 VALIDATION_ERROR', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'weak@example.com',
          password: 'weak',
          username: 'weakuser',
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ]),
      );
    });

    it('rejects an invalid username with 400 VALIDATION_ERROR', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'badusername@example.com',
          password: STRONG_PASSWORD,
          username: 'Bad Username!',
        })
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/verify-email', () => {
    it('rejects an unknown user with 404 USER_NOT_FOUND', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email: 'nope@example.com', code: '123456' })
        .expect(404);

      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('rejects a wrong code with 400 INVALID_CODE', async () => {
      await registerUser('verify1@example.com', 'verifyuser1');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email: 'verify1@example.com', code: '000000' })
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_CODE');
    });

    it('verifies with the correct code, sets refresh cookie, returns page', async () => {
      const code = await registerUser('verify2@example.com', 'verifyuser2');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email: 'verify2@example.com', code })
        .expect(200);

      expect(res.body.status).toBe('VERIFIED');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeUndefined();
      expect(res.body.user.emailVerifiedAt).not.toBeNull();
      expect(res.body.page.username).toBe('verifyuser2');
      expect(() => extractCookie(res, 'cb_refresh')).not.toThrow();
    });

    it('rejects reuse of an already-consumed code with 400 INVALID_CODE', async () => {
      const code = await registerUser('verify3@example.com', 'verifyuser3');
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email: 'verify3@example.com', code })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email: 'verify3@example.com', code })
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_CODE');
    });
  });

  describe('POST /auth/login', () => {
    it('rejects an unverified user with 403 EMAIL_NOT_VERIFIED', async () => {
      await registerUser('login1@example.com', 'loginuser1');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'login1@example.com', password: STRONG_PASSWORD })
        .expect(403);

      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('logs in a verified user and sets the refresh cookie', async () => {
      await registerAndVerifyUser('login2@example.com', 'loginuser2');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'login2@example.com', password: STRONG_PASSWORD })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeUndefined();
      expect(() => extractCookie(res, 'cb_refresh')).not.toThrow();
    });

    it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
      await registerAndVerifyUser('login3@example.com', 'loginuser3');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'login3@example.com', password: 'WrongPassword1!' })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects an unknown email with the same 401 INVALID_CREDENTIALS (anti-enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'never-registered@example.com', password: 'Whatever1!' })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates a valid refresh token', async () => {
      await registerAndVerifyUser('refresh1@example.com', 'refreshuser1');
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'refresh1@example.com', password: STRONG_PASSWORD })
        .expect(200);
      const cookie = extractCookie(loginRes, 'cb_refresh');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      const newCookie = extractCookie(res, 'cb_refresh');
      expect(newCookie).not.toBe(cookie);
    });

    it('detects reuse of a rotated token and revokes the whole session', async () => {
      await registerAndVerifyUser('refresh2@example.com', 'refreshuser2');
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'refresh2@example.com', password: STRONG_PASSWORD })
        .expect(200);
      const oldCookie = extractCookie(loginRes, 'cb_refresh');

      const firstRefresh = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldCookie)
        .expect(200);
      const newCookie = extractCookie(firstRefresh, 'cb_refresh');

      const replay = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldCookie)
        .expect(401);
      expect(replay.body.error.code).toBe('INVALID_REFRESH_TOKEN');

      const legitAttempt = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', newCookie)
        .expect(401);
      expect(legitAttempt.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('rejects a bogus token with 401 INVALID_REFRESH_TOKEN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'cb_refresh=this-was-never-issued')
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('rejects a missing cookie with 401 INVALID_REFRESH_TOKEN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /auth/logout', () => {
    it('rejects a missing access token with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });

    it('clears the cookie and revokes the refresh token server-side', async () => {
      await registerAndVerifyUser('logout1@example.com', 'logoutuser1');
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'logout1@example.com', password: STRONG_PASSWORD })
        .expect(200);
      const cookie = extractCookie(loginRes, 'cb_refresh');
      const accessToken = loginRes.body.accessToken as string;

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookie)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .expect(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /auth/resend-verification-code', () => {
    it('rejects an unknown user with 404 USER_NOT_FOUND', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification-code')
        .send({ email: 'nope@example.com' })
        .expect(404);

      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('rejects an already-verified user with 409 ALREADY_VERIFIED', async () => {
      await registerAndVerifyUser('resend1@example.com', 'resenduser1');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification-code')
        .send({ email: 'resend1@example.com' })
        .expect(409);

      expect(res.body.error.code).toBe('ALREADY_VERIFIED');
    });

    it('invalidates the old code and issues a new one', async () => {
      const oldCode = await registerUser('resend2@example.com', 'resenduser2');

      await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification-code')
        .send({ email: 'resend2@example.com' })
        .expect(200);
      const newCode = mail.lastVerificationCode?.code;
      expect(newCode).not.toBe(oldCode);

      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email: 'resend2@example.com', code: oldCode })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ email: 'resend2@example.com', code: newCode })
        .expect(200);
    });
  });

  describe('POST /auth/password/forgot + /auth/password/reset', () => {
    it('always returns 200 SENT, even for an unknown email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/password/forgot')
        .send({ email: 'unknown-nobody@example.com' })
        .expect(200);

      expect(res.body.status).toBe('SENT');
    });

    it('rejects a bogus reset token with 400 TOKEN_INVALID', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/password/reset')
        .send({ token: 'totally-bogus', newPassword: 'NewStr0ng!Pass' })
        .expect(400);

      expect(res.body.error.code).toBe('TOKEN_INVALID');
    });

    it('resets the password, revokes existing sessions, and rejects token reuse', async () => {
      await registerAndVerifyUser('reset1@example.com', 'resetuser1');
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'reset1@example.com', password: STRONG_PASSWORD })
        .expect(200);
      const refreshCookie = extractCookie(loginRes, 'cb_refresh');

      await request(app.getHttpServer())
        .post('/api/v1/auth/password/forgot')
        .send({ email: 'reset1@example.com' })
        .expect(200);
      const resetToken = mail.lastPasswordResetToken?.token;
      if (!resetToken) throw new Error('reset token was not captured');

      const weak = await request(app.getHttpServer())
        .post('/api/v1/auth/password/reset')
        .send({ token: resetToken, newPassword: 'weak' })
        .expect(400);
      expect(weak.body.error.code).toBe('VALIDATION_ERROR');

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/password/reset')
        .send({ token: resetToken, newPassword: 'NewStr0ng!Pass' })
        .expect(200);
      expect(res.body.status).toBe('RESET');

      const reuse = await request(app.getHttpServer())
        .post('/api/v1/auth/password/reset')
        .send({ token: resetToken, newPassword: 'AnotherStr0ng!Pass' })
        .expect(400);
      expect(reuse.body.error.code).toBe('TOKEN_INVALID');

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'reset1@example.com', password: STRONG_PASSWORD })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'reset1@example.com', password: 'NewStr0ng!Pass' })
        .expect(200);

      const refreshAfterReset = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(401);
      expect(refreshAfterReset.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });
});
