import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  private resolveTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const portRaw = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !portRaw || !user || !pass) {
      throw new Error('SMTP credentials are not configured');
    }

    const port = Number(portRaw);
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  async send(input: SendEmailInput): Promise<void> {
    try {
      const transporter = this.resolveTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'SafeConnect <no-reply@safeconnect.local>',
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
    } catch (error) {
      this.logger.warn(`Email send failed for ${input.to}`);
      this.logger.debug(String(error));
      throw error;
    }
  }
}
