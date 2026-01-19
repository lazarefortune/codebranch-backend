import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter;
  private readonly from: string;
  private readonly isDev: boolean;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>('mail.from') || 'noreply@codebranch.dev';
    this.isDev = this.configService.get<string>('app.nodeEnv') === 'development';

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
      this.logger.warn('SMTP not configured - emails will be logged to console only');
    }
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const { to, subject, html, text } = options;

    // In development without SMTP, just log
    if (!this.transporter) {
      this.logger.log(`[DEV EMAIL] To: ${to}`);
      this.logger.log(`[DEV EMAIL] Subject: ${subject}`);
      this.logger.log(`[DEV EMAIL] Content: ${text || html}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });

      this.logger.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      // Don't throw in dev mode
      if (!this.isDev) {
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
    const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
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
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
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
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #6366f1; margin: 0; font-size: 28px; }
    .code-box { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .btn:hover { opacity: 0.9; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>🌿 CodeBranch</h1>
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
      <h2 style="text-align: center; color: #1f2937;">Vérifiez votre adresse email</h2>
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
      <h2 style="text-align: center; color: #1f2937;">Réinitialisation de mot de passe</h2>
      <p>Bonjour,</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn">Réinitialiser mon mot de passe</a>
      </div>
      <p style="font-size: 14px; color: #666;">Ou copiez ce lien dans votre navigateur:<br><a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a></p>
      <div class="warning">
        ⏱️ Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
      </div>
    `;
    return this.getBaseTemplate(content);
  }

  private getWelcomeEmailTemplate(name?: string): string {
    const greeting = name ? `Bonjour ${name},` : 'Bonjour,';
    const content = `
      <h2 style="text-align: center; color: #1f2937;">Bienvenue sur CodeBranch! 🎉</h2>
      <p>${greeting}</p>
      <p>Votre compte a été créé avec succès! Vous faites maintenant partie de la communauté CodeBranch.</p>
      <p>Avec CodeBranch, vous pouvez:</p>
      <ul style="color: #4b5563;">
        <li>📚 Apprendre à coder avec des cours interactifs</li>
        <li>💻 Pratiquer avec des exercices en temps réel</li>
        <li>🏆 Suivre votre progression et gagner des badges</li>
        <li>👥 Rejoindre une communauté de développeurs</li>
      </ul>
      <div style="text-align: center;">
        <a href="${this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000'}" class="btn">Commencer à apprendre</a>
      </div>
      <p>Bonne programmation! 🚀</p>
    `;
    return this.getBaseTemplate(content);
  }
}
