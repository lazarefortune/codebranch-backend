import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter?: Transporter<SMTPTransport.SentMessageInfo>;
  private readonly from: string;
  private readonly allowConsoleFallback: boolean;

  constructor(private readonly configService: ConfigService) {
    this.from =
      this.configService.get<string>('mail.from') || 'noreply@codebranch.dev';
    const nodeEnv = this.configService.get<string>('app.nodeEnv');
    this.allowConsoleFallback =
      nodeEnv === 'development' || nodeEnv === 'test';

    const host = this.configService.get<string>('mail.smtpHost');
    const port = this.configService.get<number>('mail.smtpPort');
    const user = this.configService.get<string>('mail.emailUser');
    const pass = this.configService.get<string>('mail.emailPassword');

    // Only create transporter if SMTP is configured
    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });

      this.logger.log(`Mailer configured with SMTP host: ${host}:${port}`);
    } else {
      this.logger.warn(
        'SMTP not configured - emails will be logged to console only',
      );
    }
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const { to, subject, html, text } = options;

    // In development without SMTP, log mock email output.
    // In non-dev, fail fast to avoid silent delivery failures.
    if (!this.transporter) {
      if (!this.allowConsoleFallback) {
        const error = new Error('SMTP is not configured');
        this.logger.error('SMTP is not configured in production-like mode');
        throw error;
      }

      this.logger.log(`[DEV EMAIL] To: ${to}`);
      this.logger.log(`[DEV EMAIL] Subject: ${subject}`);
      this.logger.log(`[DEV EMAIL] Content: ${text || html}`);
      return;
    }

    try {
      const info: SMTPTransport.SentMessageInfo =
        await this.transporter.sendMail({
          from: this.from,
          to,
          subject,
          html,
          text: text || this.stripHtml(html),
        });

      this.logger.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      // In development/test, keep the app running if SMTP fails.
      if (!this.allowConsoleFallback) {
        throw error;
      }
    }
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    const html = this.getVerificationEmailTemplate(code);
    await this.sendMail({
      to: email,
      subject: 'Vérifiez votre adresse email - CodeBranch',
      html,
      text: `Votre code de vérification CodeBranch est: ${code}. Ce code expire dans 15 minutes.`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const html = this.getPasswordResetEmailTemplate(resetUrl);

    await this.sendMail({
      to: email,
      subject: 'Réinitialisation de votre mot de passe - CodeBranch',
      html,
      text: `Cliquez sur ce lien pour réinitialiser votre mot de passe: ${resetUrl}. Ce lien expire dans 1 heure.`,
    });
  }

  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    const html = this.getWelcomeEmailTemplate(name);
    await this.sendMail({
      to: email,
      subject: 'Bienvenue sur CodeBranch! 🚀',
      html,
      text: `Bienvenue sur CodeBranch${name ? `, ${name}` : ''}! Votre compte a été créé avec succès.`,
    });
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ========================================
  // EMAIL TEMPLATES
  // ========================================

  private getBaseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeBranch</title>
  <style></style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>ICI on mettra le logo</h1>
      </div>
      ${content}
      <div class="footer">
        <p>© ${new Date().getFullYear()} CodeBranch. Tous droits réservés.</p>
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private getVerificationEmailTemplate(code: string): string {
    const content = `
      <h2>Vérifiez votre adresse email</h2>
      <p>Bonjour,</p>
      <p>Merci de vous être inscrit sur CodeBranch! Pour activer votre compte, utilisez le code de vérification ci-dessous:</p>
      <div class="code-box">${code}</div>
      <div class="warning">
        ⏱️ Ce code expire dans <strong>15 minutes</strong>. Si vous n'avez pas demandé ce code, ignorez simplement cet email.
      </div>
      <p>À très bientôt sur CodeBranch!</p>
    `;
    return this.getBaseTemplate(content);
  }

  private getPasswordResetEmailTemplate(resetUrl: string): string {
    const content = `
      <p>Bonjour,</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn">Réinitialiser mon mot de passe</a>
      </div>
      <p>Ou copiez ce lien dans votre navigateur:<br><a>${resetUrl}</a></p>
    `;
    return this.getBaseTemplate(content);
  }

  private getWelcomeEmailTemplate(name?: string): string {
    const greeting = name ? `Bonjour ${name},` : 'Bonjour,';
    const content = `
     <div>
     <p>${greeting}</p>
     <p>Ceci est un message pour le test </p>
     </div>
    `;
    return this.getBaseTemplate(content);
  }
}
