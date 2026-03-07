import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Transporter } from 'nodemailer';
import { MailerService } from './mailer.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

type ConfigValues = Record<string, unknown>;

function createConfigService(values: ConfigValues): ConfigService {
  return {
    get: <T = unknown>(key: string) => values[key] as T,
  } as ConfigService;
}

describe('MailerService', () => {
  const createTransportMock = nodemailer.createTransport as jest.MockedFunction<
    typeof nodemailer.createTransport
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send verification email through SMTP transporter', async () => {
    const sendMailMock = jest.fn().mockResolvedValue({
      messageId: 'msg_123',
    } as SMTPTransport.SentMessageInfo);

    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
    } as unknown as Transporter<SMTPTransport.SentMessageInfo>);

    const configService = createConfigService({
      'mail.from': 'noreply@codebranch.dev',
      'mail.smtpHost': 'localhost',
      'mail.smtpPort': 1025,
      'mail.emailUser': 'smtp-user',
      'mail.emailPassword': 'smtp-pass',
      'app.nodeEnv': 'test',
    });

    const service = new MailerService(configService);
    await service.sendVerificationEmail('user@example.com', '123456');

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: { user: 'smtp-user', pass: 'smtp-pass' },
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@codebranch.dev',
        to: 'user@example.com',
        subject: 'Vérifiez votre adresse email - CodeBranch',
      }),
    );
  });

  it('should not throw when SMTP is not configured (dev/fallback mode)', async () => {
    const configService = createConfigService({
      'mail.from': 'noreply@codebranch.dev',
      'app.nodeEnv': 'development',
      'app.frontendUrl': 'http://localhost:5173',
    });

    const service = new MailerService(configService);

    await expect(
      service.sendPasswordResetEmail('user@example.com', 'reset-token'),
    ).resolves.toBeUndefined();

    expect(createTransportMock).not.toHaveBeenCalled();
  });
});
