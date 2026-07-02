import nodemailer from 'nodemailer';
import twilio from 'twilio';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface SmsMessage {
  to: string;
  body: string;
}

export class NotificationClient {
  private readonly mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  private readonly sms =
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null;

  async sendEmail(message: EmailMessage): Promise<void> {
    await this.mailer.sendMail({
      from: process.env.SMTP_USER ?? 'noreply@safeconnect.local',
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
  }

  async sendSms(message: SmsMessage): Promise<void> {
    if (!this.sms || !process.env.TWILIO_FROM_NUMBER) {
      return;
    }

    await this.sms.messages.create({
      from: process.env.TWILIO_FROM_NUMBER,
      to: message.to,
      body: message.body,
    });
  }
}
