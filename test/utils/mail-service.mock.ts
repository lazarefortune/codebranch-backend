export class MailServiceMock {
  lastVerificationCode?: { email: string; code: string };
  lastPasswordResetToken?: { email: string; token: string };

  sendVerificationCode(email: string, code: string): Promise<void> {
    this.lastVerificationCode = { email, code };
    return Promise.resolve();
  }

  sendPasswordResetLink(email: string, token: string): Promise<void> {
    this.lastPasswordResetToken = { email, token };
    return Promise.resolve();
  }
}
