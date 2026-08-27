import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendVerificationCode(email: string, code: string): Promise<void> {
    this.logger.log(`Verification code for ${email}: ${code}`);
    return Promise.resolve();
  }

  sendPasswordResetLink(email: string, token: string): Promise<void> {
    this.logger.log(`Password reset token for ${email}: ${token}`);
    return Promise.resolve();
  }
}
